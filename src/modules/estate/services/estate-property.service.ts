import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstatePropertyEntity } from '../entities/estate-property.entity';
import { IEstateProperty } from '../interfaces/estate-property.interface';

@Injectable()
export class EstatePropertyService {
  constructor(
    @InjectRepository(EstatePropertyEntity)
    private readonly estatePropertyRepository: Repository<EstatePropertyEntity>,
  ) {}

  async bulkSave(estateProperties: Partial<IEstateProperty>[], estateId: number) {
    await this.bulkDelete(estateId);

    const estatePropertiesToSave: Partial<EstatePropertyEntity>[] = estateProperties.map(
      (estateProperty) => ({
        ...estateProperty,
        categoryPropertyId: estateProperty.id,
        estateId,
      }),
    );

    return this.estatePropertyRepository.save(estatePropertiesToSave);
  }

  bulkDelete(estateId: number) {
    return this.estatePropertyRepository.delete({ estateId });
  }
}
