import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { Profile } from './profile.schema';
import { JwtAuthGuard } from '../shared/jwt-auth.guard';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Post()
  async create(
    @Body() data: Partial<Profile>,
    @Request() req: { user?: { username?: string } },
  ): Promise<Profile> {
    // Optionally, set username from JWT
    if (req.user && req.user.username) {
      data.username = req.user.username;
    }
    return this.profileService.create(data);
  }

  @Get()
  async findAll(): Promise<Profile[]> {
    return this.profileService.findAll();
  }

  @Get(':username')
  async findOne(@Param('username') username: string): Promise<Profile> {
    return this.profileService.findOne(username);
  }

  @Put(':username')
  async update(
    @Param('username') username: string,
    @Body() data: Partial<Profile>,
  ): Promise<Profile> {
    return this.profileService.update(username, data);
  }

  @Delete(':username')
  async remove(@Param('username') username: string): Promise<void> {
    return this.profileService.remove(username);
  }
}
