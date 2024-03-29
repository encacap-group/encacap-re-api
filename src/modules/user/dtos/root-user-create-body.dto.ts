/* eslint max-classes-per-file: ["error", 2] */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, Validate } from 'class-validator';
import { ROLE_SLUG_ENUM } from 'src/common/constants/role.constant';
import { RoleArrayNotExistsValidator } from '../validators/role-array-not-exists.validator';
import { UserCreateBodyDto } from './user-create-body.dto';

export class RootUserCreateBodyDto extends UserCreateBodyDto {
  @IsArray()
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  @Validate(RoleArrayNotExistsValidator, [ROLE_SLUG_ENUM.ROOT, ROLE_SLUG_ENUM.ADMIN, ROLE_SLUG_ENUM.MANAGER])
  @ApiPropertyOptional({
    isArray: true,
  })
  roleIds: number[];
}
