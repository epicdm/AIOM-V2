import { eq } from "drizzle-orm";
import { database } from "~/db";
import { user, type User, type UserRole, USER_ROLES } from "~/db/schema";
import { logResourceChange, type AuditActorType } from "./audit-logging";

export async function findUserById(id: string): Promise<User | null> {
  const [result] = await database
    .select()
    .from(user)
    .where(eq(user.id, id))
    .limit(1);

  return result || null;
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const userData = await findUserById(userId);
  if (!userData) return false;

  return userData.isAdmin;
}

export async function isUserMD(userId: string): Promise<boolean> {
  const userData = await findUserById(userId);
  if (!userData) return false;

  // MD role can also be admins
  return userData.role === "md" || userData.isAdmin;
}

// Role-based access control functions

/**
 * Validates if a string is a valid UserRole
 * @param role - The role string to validate
 * @returns true if the role is valid, false otherwise
 */
export function isValidRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole);
}

/**
 * Gets the role of a user by their ID
 * @param userId - The user's ID
 * @returns The user's role or null if user not found or has no role assigned
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  const userData = await findUserById(userId);
  if (!userData || !userData.role) return null;

  // Validate that the stored role is a valid UserRole
  if (isValidRole(userData.role)) {
    return userData.role;
  }

  return null;
}

/**
 * Assigns a role to a user
 * @param userId - The user's ID
 * @param role - The role to assign (md, field-tech, admin, sales)
 * @param actorInfo - Optional info about who performed the action (for audit logging)
 * @returns The updated user or null if user not found or role is invalid
 */
export async function assignUserRole(
  userId: string,
  role: UserRole,
  actorInfo?: {
    actorId: string;
    actorType: AuditActorType;
    actorName?: string;
    actorEmail?: string;
  }
): Promise<User | null> {
  // Validate the role
  if (!isValidRole(role)) {
    return null;
  }

  // Get current user for audit logging
  const currentUser = await findUserById(userId);
  const previousRole = currentUser?.role || null;

  const [updatedUser] = await database
    .update(user)
    .set({
      role: role,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId))
    .returning();

  // Log role change to audit trail
  if (updatedUser && actorInfo) {
    await logResourceChange(
      "user.role_changed",
      "user",
      userId,
      {
        actorId: actorInfo.actorId,
        actorType: actorInfo.actorType,
        actorName: actorInfo.actorName,
        actorEmail: actorInfo.actorEmail,
      },
      {
        previousState: { role: previousRole },
        newState: { role: role },
        changedFields: ["role"],
        description: `User role changed from ${previousRole || "none"} to ${role}`,
      },
      {
        severity: "warning",
        category: "user_management",
        metadata: {
          targetUserId: userId,
          targetUserEmail: updatedUser.email,
        },
      }
    );
  }

  return updatedUser || null;
}

/**
 * Removes a user's role (sets it to null)
 * @param userId - The user's ID
 * @returns The updated user or null if user not found
 */
export async function removeUserRole(userId: string): Promise<User | null> {
  const [updatedUser] = await database
    .update(user)
    .set({
      role: null,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId))
    .returning();

  return updatedUser || null;
}

/**
 * Checks if a user has a specific role
 * @param userId - The user's ID
 * @param role - The role to check for
 * @returns true if the user has the specified role, false otherwise
 */
export async function hasRole(userId: string, role: UserRole): Promise<boolean> {
  const userRole = await getUserRole(userId);
  return userRole === role;
}

/**
 * Checks if a user has any of the specified roles
 * @param userId - The user's ID
 * @param roles - Array of roles to check for
 * @returns true if the user has any of the specified roles, false otherwise
 */
export async function hasAnyRole(
  userId: string,
  roles: UserRole[]
): Promise<boolean> {
  const userRole = await getUserRole(userId);
  if (!userRole) return false;

  return roles.includes(userRole);
}

/**
 * Gets all users with a specific role
 * @param role - The role to filter by
 * @returns Array of users with the specified role
 */
export async function findUsersByRole(role: UserRole): Promise<User[]> {
  if (!isValidRole(role)) {
    return [];
  }

  const users = await database
    .select()
    .from(user)
    .where(eq(user.role, role));

  return users;
}
