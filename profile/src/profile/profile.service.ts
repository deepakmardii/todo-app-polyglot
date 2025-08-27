import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Profile } from './profile.schema';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(Profile.name) private profileModel: Model<Profile>,
  ) {}

  async create(data: Partial<Profile>): Promise<Profile> {
    return this.profileModel.create(data);
  }

  async findAll(): Promise<Profile[]> {
    return this.profileModel.find().exec();
  }

  async findOne(username: string): Promise<Profile> {
    const profile = await this.profileModel.findOne({ username }).exec();
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  async update(username: string, data: Partial<Profile>): Promise<Profile> {
    const profile = await this.profileModel
      .findOneAndUpdate({ username }, data, { new: true })
      .exec();
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  async remove(username: string): Promise<void> {
    await this.profileModel.deleteOne({ username }).exec();
  }
}
