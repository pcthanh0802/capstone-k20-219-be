import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BaseEntity,
  PrimaryColumn,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Base } from '../../shared/entities/base.entity';
import { UserRoleEnum } from '../enums/user-role.enum';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';
import { Comment } from '../../comments/entities/comment.entity';
import { ParkingTicket } from '../../parking-tickets/entities/parking-ticket.entity';
import { UserRefreshToken } from '../../auth/entities/user-refresh-token.entity';

@Entity('user')
export class User extends Base {
  @PrimaryColumn()
  id: string;

  @Column({ length: 45, nullable: false })
  email: string;

  @Column({ type: 'text', nullable: false })
  password: string;

  @Column({ length: 45, nullable: false })
  name: string;

  @Column()
  dob: Date;

  @Column()
  phone: string;

  @Column()
  image: string;

  @OneToMany(() => BankAccount, (bankAccount) => bankAccount.user, {
    cascade: true,
  })
  bankAccount: BankAccount[];

  @OneToMany(() => UserRole, (role) => role.user, { cascade: true })
  role: UserRole[];

  @OneToMany(() => Vehicle, (vehicle) => vehicle.user, { cascade: true })
  vehicles: Vehicle[];

  @OneToMany(() => Comment, (comment) => comment.user)
  comments: Comment[];

  @OneToMany(() => ParkingTicket, (ticket) => ticket.user)
  tickets: ParkingTicket[];

  @OneToMany(() => UserRefreshToken, (token) => token.user)
  tokens: UserRefreshToken[];
}

@Entity('bank_account')
export class BankAccount extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  accountNo: string;

  @Column()
  bank: string;

  @ManyToOne(() => User, (user) => user.bankAccount, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    orphanedRowAction: 'delete',
  })
  @JoinColumn({ name: 'userId' })
  user: User;
}

@Entity('user_role')
export class UserRole extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: UserRoleEnum })
  role: UserRoleEnum;

  @ManyToOne(() => User, (user) => user.role, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    orphanedRowAction: 'delete',
  })
  @JoinColumn({ name: 'userId' })
  user: User;
}
