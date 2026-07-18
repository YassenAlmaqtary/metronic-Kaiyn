import { Account, AccountTreeNode } from '../api/models/account.models';

/** Build a sorted parent/child tree from a flat account list. */
export function buildAccountTree(accounts: readonly Account[]): AccountTreeNode[] {
  const byId = new Map<number, AccountTreeNode>();
  const roots: AccountTreeNode[] = [];

  for (const account of accounts) {
    byId.set(account.accId, {
      ...account,
      children: [],
      level: 0,
      hasChildren: false,
    });
  }

  for (const node of byId.values()) {
    const parentId = node.accParent;
    if (parentId != null && byId.has(parentId) && parentId !== node.accId) {
      byId.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRecursive = (nodes: AccountTreeNode[], level: number): void => {
    nodes.sort((a, b) => a.accCode - b.accCode);
    for (const node of nodes) {
      node.level = level;
      node.hasChildren = node.children.length > 0;
      sortRecursive(node.children, level + 1);
    }
  };

  sortRecursive(roots, 0);
  return roots;
}

/** Flatten visible nodes based on expanded set. */
export function flattenVisibleAccountTree(
  roots: readonly AccountTreeNode[],
  expandedIds: ReadonlySet<number>,
): AccountTreeNode[] {
  const result: AccountTreeNode[] = [];

  const walk = (nodes: readonly AccountTreeNode[]): void => {
    for (const node of nodes) {
      result.push(node);
      if (node.hasChildren && expandedIds.has(node.accId)) {
        walk(node.children);
      }
    }
  };

  walk(roots);
  return result;
}

/** Collect all ancestor ids for matching search results so parents stay expanded. */
export function collectAncestorIds(
  accounts: readonly Account[],
  matchIds: readonly number[],
): Set<number> {
  const byId = new Map(accounts.map((account) => [account.accId, account]));
  const ancestors = new Set<number>();

  for (const matchId of matchIds) {
    let current = byId.get(matchId);
    while (current?.accParent != null) {
      const parentId = current.accParent;
      if (ancestors.has(parentId)) {
        break;
      }
      ancestors.add(parentId);
      current = byId.get(parentId);
    }
  }

  return ancestors;
}

export function collectAllParentIds(roots: readonly AccountTreeNode[]): Set<number> {
  const ids = new Set<number>();

  const walk = (nodes: readonly AccountTreeNode[]): void => {
    for (const node of nodes) {
      if (node.hasChildren) {
        ids.add(node.accId);
        walk(node.children);
      }
    }
  };

  walk(roots);
  return ids;
}
