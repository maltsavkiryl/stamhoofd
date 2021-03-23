import { AutoEncoder, BooleanDecoder, DateDecoder, field, StringDecoder } from "@simonbackx/simple-encoding";
import { v4 as uuidv4 } from "uuid";

import { Organization } from "../Organization";
// eslint bug thinks MemberDetails is not used
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { MemberDetails } from "./MemberDetails";
import { RecordTypeHelper } from "./RecordType";
import { ReviewTimes } from "./ReviewTime";


export class MemberDetailsMeta extends AutoEncoder {
    /// Date of encryption
    @field({ decoder: DateDecoder })
    date: Date = new Date()

    /// Date when this was last encrypted by someone who owned the private key (or when it was first encrypted by someone else)
    /// This is used to remove old keys
    @field({ decoder: DateDecoder, version: 68, upgrade: function (this: MemberDetailsMeta) { return this.date } })
    ownerDate: Date = new Date()

    // Keep track of the filled tracks
    @field({ decoder: BooleanDecoder })
    hasMemberGeneral = false

    @field({ decoder: BooleanDecoder })
    hasParents = false

    @field({ decoder: BooleanDecoder })
    hasEmergency = false

    @field({ decoder: BooleanDecoder })
    hasRecords = false

    /**
     * Whether this change was made without having all the available data
     */
    @field({ decoder: BooleanDecoder, version: 70 })
    isRecovered = false

    /**
     * Keep track of when certain information was reviewed
     */
    @field({ decoder: ReviewTimes, nullable: true, version: 71 })
    reviewTimes = ReviewTimes.create({})

    static createFor(details: MemberDetails): MemberDetailsMeta {
        return MemberDetailsMeta.create({
            hasMemberGeneral: details.lastName.length > 0 && details.birthDay !== null,
            hasParents: details.address !== null || details.parents.length > 0 || (details.age !== null && details.age > 18),
            hasEmergency: details.emergencyContacts.length > 0,
            hasRecords: details.records.length > 0,
            isRecovered: details.isRecovered,
            reviewTimes: details.reviewTimes
        })
    }

    merge(other: MemberDetailsMeta) {
        if (other.hasMemberGeneral) {
            this.hasMemberGeneral = true
        }

        if (other.hasParents) {
            this.hasParents = true
        }
        if (other.hasEmergency) {
            this.hasEmergency = true
        }

        if (other.hasRecords) {
            this.hasRecords = true
        }

        if (!other.isRecovered) {
            this.isRecovered = false
        }

        this.reviewTimes.merge(other.reviewTimes)
    }
}


export class EncryptedMemberDetails extends AutoEncoder {
    @field({ decoder: StringDecoder, defaultValue: () => uuidv4() })
    id: string;

    /**
     * The public key that was used for this encryption
     */
    @field({ decoder: StringDecoder })
    publicKey: string

    @field({ decoder: StringDecoder })
    ciphertext: string

    /**
     * Some data is public. For example: permissions to collect data and the firstName. In the future we might add
     * more options to make certain data public
     * This data is taken from the details before it is encrypted and stored separately.
     * Please note that the ciphertext should NOT include the same data to prevent known ciphertext attacks
     */
    @field({ decoder: MemberDetails, nullable: true, version: 72 })
    publicData: MemberDetails | null = null

    /// Whether this was encrypted with the current organization public key
    @field({ decoder: BooleanDecoder })
    forOrganization = false

    /// Encryption author
    @field({ decoder: StringDecoder })
    authorId: string

    /// Encryption author
    @field({ decoder: MemberDetailsMeta })
    meta: MemberDetailsMeta

    /**
     * Get the data of this member details that is stored non encrypted.
     * @param organization not used at the moment but we'll need it for future organization settings that defines this behaviour
     */
    static getPublicData(original: MemberDetails, organization: Organization): MemberDetails | null {
        if (original.records.length === 0) {
            // Nothing to announce publicly
            return null
        }

        const details = MemberDetails.create({})
        details.isRecovered = true
        details.records = original.records.filter(r => RecordTypeHelper.isPublic(r.type))

        if (details.records.length == 0) {
            return null
        }
        return details
    }
}