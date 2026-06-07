import { IsObject } from "class-validator";

export class UpdatePublicKeyDto {
  @IsObject()
  publicKey!: JsonWebKey;
}
