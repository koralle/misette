type RecipeRelationship = "allUsers" | "editor" | "none" | "owner" | "viewer";

interface RecipeAccess {
  canAddRevision: boolean;
  canRead: boolean;
}

const accessByRelationship: Record<RecipeRelationship, RecipeAccess> = {
  allUsers: { canAddRevision: false, canRead: true },
  editor: { canAddRevision: true, canRead: true },
  none: { canAddRevision: false, canRead: false },
  owner: { canAddRevision: true, canRead: true },
  viewer: { canAddRevision: false, canRead: true },
};

interface RecipeAccessInput {
  ownerUserId: string;
  permission: "editor" | "viewer" | null;
  userId: string;
  visibility: "all_users" | "private";
}

const getRelationship = ({
  ownerUserId,
  permission,
  userId,
  visibility,
}: RecipeAccessInput): RecipeRelationship => {
  if (ownerUserId === userId) {
    return "owner";
  }
  if (permission === "editor") {
    return "editor";
  }
  if (permission === "viewer") {
    return "viewer";
  }
  if (visibility === "all_users") {
    return "allUsers";
  }
  return "none";
};

export const getRecipeAccess = (input: RecipeAccessInput): RecipeAccess =>
  accessByRelationship[getRelationship(input)];
