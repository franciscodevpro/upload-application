import { UserRightsEnum } from "../enums/user-rights-enum";

const getUserRightsArray = (accessRights: string | undefined) => {
  if (!accessRights) return [];
  return accessRights.split(",");
};

export const validateUserCanUploadPublicFiles = (
  accessRights: string | undefined,
) => {
  const rightsArray = getUserRightsArray(accessRights);
  return (
    rightsArray.includes(UserRightsEnum.WRITE_PUBLIC) ||
    rightsArray.includes(UserRightsEnum.ADMIN)
  );
};

export const validateUserCanWrite = (accessRights: string | undefined) => {
  const rightsArray = getUserRightsArray(accessRights);
  return (
    rightsArray.includes(UserRightsEnum.WRITE) ||
    rightsArray.includes(UserRightsEnum.ADMIN)
  );
};
