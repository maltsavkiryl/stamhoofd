ALTER TABLE `members` ADD COLUMN `organizationPublicKey` varchar(250) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL COMMENT '' AFTER `publicKey`;
UPDATE members join organizations on organizations.id = members.organizationId set members.organizationPublicKey = organizations.publicKey;