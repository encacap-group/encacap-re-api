import { IREUser } from '@encacap-group/common/dist/re';
import { Controller, Delete, Get, Param, Query, UseGuards } from '@nestjs/common';
import { User } from 'src/common/decorators/user.decorator';
import { AdminAuthGuard } from 'src/common/guards/admin-auth.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AddressBookDeleteParamDto } from '../dtos/address-book-delete-param.dto';
import { AddressBookListQueryDto } from '../dtos/address-book-list-query.dto';
import { AddressBookService } from '../services/address-book.service';

@UseGuards(JwtAuthGuard, AdminAuthGuard)
@Controller('admin/locations/address-books')
export class AdminAddressBookController {
  constructor(private readonly addressBookService: AddressBookService) {}

  @Get()
  index(@Query() query: AddressBookListQueryDto, @User() user: IREUser) {
    return this.addressBookService.getAll({
      ...query,
      websiteId: user.websiteId,
    });
  }

  @Delete(':id')
  delete(@Param() { id }: AddressBookDeleteParamDto) {
    return this.addressBookService.delete(id);
  }
}
