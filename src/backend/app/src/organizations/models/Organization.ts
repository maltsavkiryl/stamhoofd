import { Model } from "@stamhoofd-backend/database";
import { column } from "@stamhoofd-backend/database";
import { OrganizationMetaStruct } from "../structs/OrganizationMetaStruct";
import { Database } from "@stamhoofd-backend/database";
import { ClientError } from "@stamhoofd-backend/routing";

export class Organization extends Model {
    static table = "organizations";

    @column({ primary: true, type: "integer" })
    id: number | null = null;

    @column({ type: "string" })
    name: string;

    /// URL to a website page or a Facebook page
    @column({ type: "string", nullable: true })
    website: string | null = null;

    /// A custom domain name that is used to host the register application (should be unique)
    // E.g. inschrijven.scoutswetteren.be
    @column({ type: "string", nullable: true })
    registerDomain: string | null = null;

    // Unique representation of this organization from a string, that is used to provide the default domains
    // in uri.stamhoofd.be
    @column({ type: "string" })
    uri: string;

    @column({ type: "json", decoder: OrganizationMetaStruct })
    meta: OrganizationMetaStruct;

    @column({ type: "string" })
    publicKey: string;

    @column({ type: "datetime" })
    createdOn: Date;

    @column({ type: "datetime", nullable: true })
    updatedOn: Date | null = null;

    // Methods
    static async getByID(id: number): Promise<Organization | undefined> {
        const [rows] = await Database.select(
            `SELECT ${this.getDefaultSelect()} FROM ${this.table} WHERE ${this.primary.name} = ? LIMIT 1`,
            [id]
        );

        if (rows.length == 0) {
            return undefined;
        }

        // Read member + address from first row
        return this.fromRow(rows[0][this.table]);
    }

    // Methods
    static async getByURI(uri: string): Promise<Organization | undefined> {
        const [rows] = await Database.select(
            `SELECT ${this.getDefaultSelect()} FROM ${this.table} WHERE \`uri\` = ? LIMIT 1`,
            [uri]
        );

        if (rows.length == 0) {
            return undefined;
        }

        // Read member + address from first row
        return this.fromRow(rows[0][this.table]);
    }

    // Methods
    private static async getByRegisterDomain(host: string): Promise<Organization | undefined> {
        const [rows] = await Database.select(
            `SELECT ${this.getDefaultSelect()} FROM ${this.table} WHERE \`registerDomain\` = ? LIMIT 1`,
            [host]
        );

        if (rows.length == 0) {
            return undefined;
        }

        // Read member + address from first row
        return this.fromRow(rows[0][this.table]);
    }

    /**
     * Get an Organization by looking at the host of a request
     * Throws if the organization could not be found
     */
    static async fromHost(host: string): Promise<Organization> {
        // Todo: we need to read this from a config or environment file
        const defaultDomain = ".stamhoofd.be";

        if (host.startsWith("api.")) {
            host = host.substring(4);
        }

        if (host.endsWith(defaultDomain)) {
            // Search by URI
            const uri = host.substring(0, host.length - defaultDomain.length);
            const organization = await this.getByURI(uri);
            if (!organization) {
                throw new ClientError({
                    code: "invalid_organization",
                    message: "Unknown organization " + uri,
                });
            }
            return organization;
        }

        const organization = await this.getByRegisterDomain(host);
        if (!organization) {
            throw new ClientError({
                code: "invalid_organization",
                message: "No organization known for host " + host,
            });
        }
        return organization;
    }

    getHost(): string {
        if (this.registerDomain) {
            return this.registerDomain;
        }
        const defaultDomain = ".stamhoofd.be";
        return this.uri + defaultDomain;
    }

    getApiHost(): string {
        if (this.registerDomain) {
            return "api." + this.registerDomain;
        }
        const defaultDomain = ".stamhoofd.be";
        return "api." + this.uri + defaultDomain;
    }
}
