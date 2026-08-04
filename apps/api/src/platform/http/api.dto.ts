import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SessionUserDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'email' }) email!: string;
  @ApiProperty({ format: 'date' }) birthDate!: string;
  @ApiProperty({ default: false }) showAge!: boolean;
  @ApiProperty({ default: false }) onboardingCompleted!: boolean;
}

export class SessionEnvelopeDto {
  @ApiProperty() sessionToken!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
  @ApiProperty({ type: SessionUserDto }) user!: SessionUserDto;
}

export class CityDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty() timeZone!: string;
}

export class CategoryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
}

export class MeDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'email' }) email!: string;
  @ApiProperty({ format: 'date' }) birthDate!: string;
  @ApiPropertyOptional({ nullable: true, type: String })
  displayName!: string | null;
  @ApiProperty({ default: false }) showAge!: boolean;
  @ApiPropertyOptional({ nullable: true, type: String }) avatarUrl!:
    string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) bio!: string | null;
  @ApiPropertyOptional({ nullable: true, type: CityDto }) city!: CityDto | null;
  @ApiProperty({ type: [CategoryDto] }) interests!: CategoryDto[];
  @ApiProperty() onboardingCompleted!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class ParticipantDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() displayName!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) avatarUrl!:
    string | null;
  @ApiPropertyOptional() age?: number;
}

export class MyParticipationDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({
    enum: ['pending', 'going', 'rejected', 'withdrawn', 'cancelled'],
  })
  status!: string;
  @ApiProperty() seenEventVersion!: number;
  @ApiProperty() hasEventUpdates!: boolean;
}

export class EventSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ type: CategoryDto }) category!: CategoryDto;
  @ApiProperty({ type: CityDto }) city!: CityDto;
  @ApiProperty() meetingPlace!: string;
  @ApiProperty({ format: 'date-time' }) startsAt!: string;
  @ApiPropertyOptional({ format: 'date-time', nullable: true, type: String })
  endsAt!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) imageUrl!:
    string | null;
  @ApiProperty({ enum: ['automatic', 'approval_required'] })
  participationMode!: string;
  @ApiProperty() participantsCount!: number;
  @ApiProperty() capacity!: number;
  @ApiProperty() isFull!: boolean;
  @ApiProperty({ enum: ['published', 'cancelled'] }) status!: string;
  @ApiProperty() contentVersion!: number;
}

export class EventDetailsDto extends EventSummaryDto {
  @ApiProperty() description!: string;
  @ApiProperty({ type: ParticipantDto }) organizer!: ParticipantDto;
  @ApiProperty({ type: [ParticipantDto] }) participants!: ParticipantDto[];
  @ApiProperty() version!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
  @ApiPropertyOptional({ type: MyParticipationDto, nullable: true })
  myParticipation!: MyParticipationDto | null;
  @ApiProperty({ type: [String] }) availableActions!: string[];
}

export class EventListDto {
  @ApiProperty({ type: [EventSummaryDto] }) items!: EventSummaryDto[];
  @ApiPropertyOptional({ nullable: true, type: String }) nextCursor!:
    string | null;
}

export class JoinEventDto {
  @ApiProperty({ type: MyParticipationDto }) participation!: MyParticipationDto;
  @ApiProperty() participantsCount!: number;
  @ApiProperty() capacity!: number;
  @ApiProperty() isFull!: boolean;
}
