"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateParkingSlotDto = exports.GetParkingSlotDto = exports.UpsertParkingSlotDto = exports.CreateParkingSlotDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateParkingSlotDto {
}
exports.CreateParkingSlotDto = CreateParkingSlotDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 10),
    __metadata("design:type", String)
], CreateParkingSlotDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.Length)(3, 3),
    __metadata("design:type", String)
], CreateParkingSlotDto.prototype, "typeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateParkingSlotDto.prototype, "x_start", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateParkingSlotDto.prototype, "x_end", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateParkingSlotDto.prototype, "y_start", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateParkingSlotDto.prototype, "y_end", void 0);
class UpsertParkingSlotDto {
}
exports.UpsertParkingSlotDto = UpsertParkingSlotDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], UpsertParkingSlotDto.prototype, "slots", void 0);
class GetParkingSlotDto {
}
exports.GetParkingSlotDto = GetParkingSlotDto;
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GetParkingSlotDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GetParkingSlotDto.prototype, "typeId", void 0);
class UpdateParkingSlotDto extends (0, swagger_1.PartialType)(CreateParkingSlotDto) {
}
exports.UpdateParkingSlotDto = UpdateParkingSlotDto;
//# sourceMappingURL=parking-slot.dto.js.map