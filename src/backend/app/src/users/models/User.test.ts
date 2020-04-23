import { User } from "./User";
import { Database } from "@stamhoofd-backend/database";
import { Organization } from "@stamhoofd-backend/app/src/organizations/models/Organization";
import { OrganizationFactory } from "@stamhoofd-backend/app/src/organizations/factories/OrganizationFactory";

describe("Model.User", () => {
    let existingUserId: number;
    let organization: Organization;

    beforeAll(async () => {
        organization = await new OrganizationFactory({}).create();

        const [data] = await Database.insert("INSERT INTO " + User.table + " SET ?", [
            {
                organizationId: organization.id,
                email: "existing@domain.com",
                password:
                    "$argon2i$v=19$m=4096,t=3,p=1$wQiDNFtEKm8mQsdqJGnhfg$V4hByYMRUA/H9DipmJRG8QOn12wa+feRhi/ocBxxc2k",
                publicKey: "My public key here",
                // = "myPassword"
                createdOn: "2020-03-29 14:30:15",
                updatedOn: "2020-03-29 14:30:15",
            },
        ]);
        existingUserId = data.insertId;
    });

    test("Get user by id", async () => {
        const user: any = await User.getByID(existingUserId);
        expect(user).toBeDefined();
        expect(user).toBeInstanceOf(User);
        expect(user.password).toBeUndefined();
        expect(user.savedProperties.get("password")).toBeUndefined();
        expect(user.id).toBeGreaterThanOrEqual(1);
    });

    test("Create a user", async () => {
        const user: any = await User.register(organization, "test@domain.com", "myPassword", "public key");
        expect(user).toBeDefined();
        expect(user).toBeInstanceOf(User);
        expect(user.password).toBeUndefined();
        expect(user.savedProperties.get("password")).toBeUndefined();
        expect(user.id).toBeGreaterThanOrEqual(1);
    });

    test("Create a user with an email that already exists", async () => {
        const user: any = await User.register(organization, "existing@domain.com", "otherPassword123", "my public key");
        expect(user).toBeUndefined();
    });

    test("Login a user", async () => {
        const user: any = await User.login(organization, "existing@domain.com", "myPassword");
        expect(user).toBeInstanceOf(User);
        expect(user.password).toBeUndefined();
        expect(user.savedProperties.get("password")).toBeUndefined();
        expect(user.id).toBeGreaterThanOrEqual(1);
    });

    test("Providing a wrong password fails login", async () => {
        const user: any = await User.login(organization, "existing@domain.com", "myPassword2");
        expect(user).toBeUndefined();
    });

    test("Providing a wrong email fails login", async () => {
        const user: any = await User.login(organization, "not-existing@domain.com", "myPassword");
        expect(user).toBeUndefined();
    });
});
