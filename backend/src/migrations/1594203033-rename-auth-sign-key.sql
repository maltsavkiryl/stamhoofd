ALTER TABLE `users` CHANGE `publicAuthKey` `publicAuthSignKey` varchar(255) CHARACTER SET ascii NULL COMMENT '' AFTER `publicKey`;