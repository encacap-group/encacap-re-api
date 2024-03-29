import { ESTATE_QUARTER_ENUM } from '@encacap-group/common/dist/re';
import { BaseEntityWithPrimaryCodeColumn } from 'src/base/base.entity';
import { Column, Entity } from 'typeorm';

@Entity({ name: 'estate_quarters' })
export class EstateQuarterEntity extends BaseEntityWithPrimaryCodeColumn {
  @Column({
    name: 'code',
    enum: ESTATE_QUARTER_ENUM,
  })
  code: ESTATE_QUARTER_ENUM;

  @Column({
    name: 'name',
  })
  name: string;

  @Column({
    name: 'order',
    default: 0,
  })
  order: number;
}
