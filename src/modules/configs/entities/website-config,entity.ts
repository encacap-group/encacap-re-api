import { CONFIG_TYPE_ENUM } from '@encacap-group/common/dist/re';
import { BaseEntityWithPrimaryGeneratedColumn } from 'src/base/base.entity';
import { WebsiteEntity } from 'src/modules/website/entities/website.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

@Entity({ name: 'website_configs' })
export class WebsiteConfigEntity extends BaseEntityWithPrimaryGeneratedColumn {
  @Column({ name: 'code' })
  code!: string;

  @Column({ name: 'value', type: String })
  value!: string;

  @Column({ name: 'type', enum: CONFIG_TYPE_ENUM })
  type!: CONFIG_TYPE_ENUM;

  @Column({ name: 'website_id' })
  websiteId!: number;

  @ManyToOne(() => WebsiteEntity)
  @JoinColumn({ name: 'website_id', referencedColumnName: 'id' })
  website!: WebsiteEntity;
}
