import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Profile extends Document {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop()
  displayName: string;

  @Prop()
  bio: string;
}

export const ProfileSchema = SchemaFactory.createForClass(Profile);
