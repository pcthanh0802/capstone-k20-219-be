import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ParkingTicketsService } from './parking-tickets.service';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRoleEnum } from '../users/enums/user-role.enum';
import {
  CheckOutDto,
  CreateParkingTicketDto,
  GetParkingTicketDto,
  UpdateTicketPaidStatusDto,
} from './dtos/parking-ticket.request.dto';
import { SlotBookingsService } from '../slot-bookings/slot-bookings.service';
import {
  And,
  IsNull,
  LessThanOrEqual,
  Like,
  MoreThanOrEqual,
  Not,
} from 'typeorm';
import { getDateString } from '../shared/helpers/getDateString';
import { idGenerator } from '../shared/helpers/idGenerator';
import { Response } from 'express';
import { VehicleTypesService } from '../vehicle-types/vehicle-types.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { ParkingSlotsService } from '../parking-slots/parking-slots.service';

@Controller('parking-tickets')
@ApiTags('Parking tickets')
@UseGuards(AuthGuard)
export class ParkingTicketsController {
  constructor(
    private readonly ticketsService: ParkingTicketsService,
    private readonly slotBookingsService: SlotBookingsService,
    private readonly vehicleTypesService: VehicleTypesService,
    private readonly vehiclesService: VehiclesService,
    private readonly slotsService: ParkingSlotsService,
  ) {}

  @Post('check-in')
  @UseGuards(RolesGuard)
  @Roles(UserRoleEnum.MANAGER, UserRoleEnum.EMPLOYEE)
  async checkIn(
    @Body() checkInInfo: CreateParkingTicketDto,
    @Res() res: Response,
  ) {
    try {
      // check if car is registered
      const vehicle = await this.vehiclesService.findOne({
        select: ['id', 'userId', 'plateNo', 'typeId'],
        where: { plateNo: checkInInfo.plateNo },
      });
      if (!vehicle) {
        return res.status(400).send('vehicle not registered');
      }

      // check if car is checked in
      const isParking = await this.ticketsService.findOne({
        where: {
          plateNo: vehicle.plateNo,
          userId: vehicle.userId,
          checkOutTime: IsNull(),
        },
      });
      if (isParking) {
        return res.status(400).send('vehicle already checked in');
      }

      // Check if car already reserved a slot
      const currentTime = new Date();
      const slotBooking = await this.slotBookingsService.findOne({
        where: {
          vehicle: { plateNo: checkInInfo.plateNo },
          arrivalTime: MoreThanOrEqual(currentTime),
        },
      });

      // assign slot
      let slotId: string = '';
      if (slotBooking) {
        slotId = slotBooking.slotId;
      } else {
        const slots = await this.slotsService.find({
          select: ['id'],
          where: { typeId: vehicle.typeId },
          order: { id: 'ASC' },
        });
        const slotIds = slots.map((item) => item.id);
        const occupiedSlots = await this.slotsService.find({
          select: ['id'],
          where: {
            typeId: vehicle.typeId,
            tickets: { createdAt: Not(IsNull()), checkOutTime: IsNull() },
          },
          order: { id: 'ASC' },
        });
        const bookedSlots = await this.slotsService.find({
          select: ['id'],
          where: {
            typeId: vehicle.typeId,
            bookings: { arrivalTime: MoreThanOrEqual(currentTime) },
          },
          order: { id: 'ASC' },
        });
        const unavailSlotIds = Array.from(
          new Set([
            ...occupiedSlots.map((item) => item.id),
            ...bookedSlots.map((item) => item.id),
          ]),
        );
        for (const id of slotIds) {
          if (!unavailSlotIds.includes(id)) {
            slotId = id;
            break;
          }
        }

        if (slotId == '') {
          return res.status(400).send('no available slot');
        }
      }

      // // check if slot is being occupied
      // const occupied = await this.ticketsService.find({
      //   where: { slotId: slotId, checkOutTime: IsNull() },
      // });
      // if (occupied.length) {
      //   return res.status(400).send('slot_occupied');
      // }

      // generate id
      let id = getDateString();
      const latest = await this.ticketsService.find({
        where: { id: Like(`${id}%`) },
        skip: 0,
        take: 1,
        order: { createdAt: 'DESC' },
      });
      let number = 1;
      if (latest.length) number = Number(latest[0].id.substring(9)) + 1;
      id = idGenerator(4, number, `${id}-`);

      // save to database
      const ticket = {
        id: id,
        slotId: slotId,
        plateNo: checkInInfo.plateNo,
        userId: vehicle.userId,
      };
      const result = await this.ticketsService.create(ticket);

      // remove the booking reservation
      if (slotBooking) {
        await this.slotBookingsService.remove(slotBooking.id);
      }

      // send email to guest (?)
      // if (!checkInInfo.userId && checkInInfo.email) {
      // }

      return res.status(201).send(result);
    } catch (err) {
      res.status(500).send(err.message);
    }
  }

  @Get('/my')
  async findMyTickets(@Req() req: Request, @Res() res: Response) {
    try {
      const { id: userId } = req['user'];
      const cond = { where: { userId: userId, checkOutTime: IsNull() } };
      const result = await this.ticketsService.find(cond);
      return res.status(200).send(result);
    } catch (err) {
      res.status(500).send(err.message);
    }
  }

  @Get('/all')
  @UseGuards(RolesGuard)
  @Roles(UserRoleEnum.MANAGER, UserRoleEnum.EMPLOYEE)
  async findAll(@Res() res: Response) {
    try {
      const result = await this.ticketsService.find({
        where: { checkOutTime: IsNull() },
      });
      return res.status(200).send(result);
    } catch (err) {
      res.status(500).send(err.message);
    }
  }

  @Post('check-out')
  @UseGuards(RolesGuard)
  @Roles(UserRoleEnum.MANAGER, UserRoleEnum.EMPLOYEE)
  async checkOut(@Body() checkOutDto: CheckOutDto, @Res() res: Response) {
    try {
      const ticket = await this.ticketsService.findOne({
        where: { id: checkOutDto.id },
        relations: { slot: true, serviceBookings: { service: true } },
      });
      if (ticket.checkOutTime)
        return res.status(400).send('ticket already checked out');

      // compare plate number in ticket with that from scanner
      if (ticket.plateNo !== checkOutDto.plateNo) {
        return res.status(400).send('incorrect_plate');
      }
      // get check out time and calculate parking cost
      const checkOutTime = new Date();
      const parkingDuration = Math.ceil(
        (checkOutTime.getTime() - ticket.createdAt.getTime()) / 3600000,
      );
      const vehicleType = await this.vehicleTypesService.findOne({
        select: ['id', 'parkingFee'],
        where: { id: ticket.slot.typeId },
      });
      const parkingCost = parkingDuration * vehicleType.parkingFee;

      // generate invoice
      const invoice = {
        ticketId: ticket.id,
        plateNo: checkOutDto.plateNo,
        checkInTime: ticket.createdAt,
        checkoutTime: checkOutTime,
        slotId: ticket.slotId,
        parkingCost: parkingCost,
        services: ticket.serviceBookings.map((item) => {
          return {
            serviceId: item.serviceId,
            name: item.service.name,
            quantity: item.quantity,
            cost: item.cost,
          };
        }),
      };

      // update parkingCost and checkOutTime in database
      await this.ticketsService.update(ticket.id, {
        checkOutTime: checkOutTime,
        parkingCost: parkingCost,
      });
      // return invoice
      return res.status(200).send(invoice);
    } catch (err) {
      res.status(500).send(err.message);
    }
  }

  @Put('/updateTicketPaidStatus')
  @UseGuards(RolesGuard)
  @Roles(UserRoleEnum.MANAGER, UserRoleEnum.EMPLOYEE)
  async updateTicketPaidStatus(
    @Body() updateDto: UpdateTicketPaidStatusDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.ticketsService.update(updateDto.id, {
        isPaid: updateDto.isPaid,
      });
      res.status(200).send(result);
    } catch (err) {
      res.status(500).send(err.message);
    }
  }

  @Get('/history/my')
  async getMyHistory(
    @Req() req: Request,
    @Query() filter: GetParkingTicketDto,
    @Res() res: Response,
  ) {
    try {
      const { id: userId } = req['user'];
      const cond = {
        select: [
          'id',
          'plateNo',
          'createdAt',
          'checkOutTime',
          'slotId',
          'parkingCost',
        ],
        where: { userId: userId, isPaid: true, checkOutTime: Not(IsNull()) },
        // relations: { serviceBookings: { service: true } },
      };

      const timeCond = [Not(IsNull())];
      if (filter.fromDate) {
        timeCond.push(MoreThanOrEqual(new Date(filter.fromDate)));
      }
      if (filter.toDate) {
        timeCond.push(LessThanOrEqual(new Date(filter.toDate)));
      }
      cond['where']['checkOutTime'] = And(...timeCond);

      const tickets = await this.ticketsService.find(cond);
      const result = tickets.map((ticket) => {
        return {
          ticketId: ticket.id,
          plateNo: ticket.plateNo,
          checkInTime: ticket.createdAt,
          checkOutTime: ticket.checkOutTime,
          slotId: ticket.slotId,
          parkingCost: ticket.parkingCost,
          // services: ticket.serviceBookings.map((item) => {
          //   return {
          //     serviceId: item.serviceId,
          //     name: item.service.name,
          //     quantity: item.quantity,
          //     cost: item.cost,
          //   };
          // }),
        };
      });
      return res.status(200).send(result);
    } catch (err) {
      res.status(500).send(err.message);
    }
  }

  @Get('/history/all')
  @UseGuards(RolesGuard)
  @Roles(UserRoleEnum.MANAGER, UserRoleEnum.EMPLOYEE)
  async getHistoryForEmployee(
    @Query() filter: GetParkingTicketDto,
    @Res() res: Response,
  ) {
    try {
      const cond = {
        select: [
          'id',
          'plateNo',
          'createdAt',
          'checkOutTime',
          'slotId',
          'parkingCost',
        ],
        where: { isPaid: true },
        relations: { serviceBookings: { service: true } },
      };

      if (filter.serviceId) {
        cond['where']['serviceBookings'] = { serviceId: filter.serviceId };
      }
      const timeCond = [Not(IsNull())];
      if (filter.fromDate) {
        timeCond.push(MoreThanOrEqual(new Date(filter.fromDate)));
      }
      if (filter.toDate) {
        timeCond.push(LessThanOrEqual(new Date(filter.toDate)));
      }
      cond['where']['checkOutTime'] = And(...timeCond);

      const tickets = await this.ticketsService.find(cond);
      const result = tickets.map((ticket) => {
        return {
          ticketId: ticket.id,
          plateNo: ticket.plateNo,
          checkInTime: ticket.createdAt,
          checkOutTime: ticket.checkOutTime,
          slotId: ticket.slotId,
          parkingCost: ticket.parkingCost,
          services: ticket.serviceBookings.map((item) => {
            return {
              serviceId: item.serviceId,
              name: item.service.name,
              quantity: item.quantity,
              cost: item.cost,
            };
          }),
        };
      });
      return res.status(200).send(result);
    } catch (err) {
      res.status(500).send(err.message);
    }
  }

  @Get('/history/details/:id')
  async getTicketDetails(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const { id: userId, roles } = req['user'];
      const cond = {
        where: { id: id, isPaid: true, checkOutTime: Not(IsNull()) },
        relations: { slot: true, serviceBookings: { service: true } },
      };
      if (!roles.includes('manager') || !roles.includes('employee')) {
        cond.where['userId'] = userId;
      }
      const ticket = await this.ticketsService.findOne(cond);

      if (!ticket) {
        return res.status(400).send('Ticket not found');
      }

      const result = {
        ticketId: ticket.id,
        plateNo: ticket.plateNo,
        chcekInTime: ticket.createdAt,
        checkOutTime: ticket.checkOutTime,
        slotId: ticket.slotId,
        parkingCost: ticket.parkingCost,
        services: ticket.serviceBookings.map((booking) => {
          return {
            serviceId: booking.serviceId,
            name: booking.service.name,
            quantity: booking.quantity,
            cost: booking.cost,
          };
        }),
      };
      return res.status(200).send(result);
    } catch (err) {
      res.status(500).send(err.message);
    }
  }

  @Get('/history/checkIn')
  @UseGuards(RolesGuard)
  @Roles(UserRoleEnum.MANAGER, UserRoleEnum.EMPLOYEE)
  async getCheckInHistoryForEmployee(
    @Query() filter: GetParkingTicketDto,
    @Res() res: Response,
  ) {
    try {
      const cond = {
        select: [
          'id',
          'plateNo',
          'createdAt',
          'checkOutTime',
          'slotId',
          'parkingCost',
        ],
      };

      const timeCond = [];
      if (filter.fromDate) {
        timeCond.push(MoreThanOrEqual(new Date(filter.fromDate)));
      }
      if (filter.toDate) {
        timeCond.push(LessThanOrEqual(new Date(filter.toDate)));
      }
      cond['where'] = { createdAt: And(...timeCond) };

      const tickets = await this.ticketsService.find(cond);
      const result = tickets.map((ticket) => {
        return {
          ticketId: ticket.id,
          plateNo: ticket.plateNo,
          checkInTime: ticket.createdAt,
          checkOutTime: ticket.checkOutTime,
          slotId: ticket.slotId,
          parkingCost: ticket.parkingCost,
        };
      });
      return res.status(200).send(result);
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
}
