const TEAM_TREE_MESSAGES = Object.freeze({
  network: '\u26A0\uFE0F Please check your internet connection',
  server: 'Server issue. Please try again later',
  timeout: '\u23F3 Request is taking too long. Try again',
  noData: 'No team data available yet',
  fallback: 'Unable to load the binary team tree right now.'
});

const TEAM_TREE_EMPTY_DESCRIPTION = 'Start referring users to populate your binary tree.';

function hasRenderableTreeNode(node) {
  return Boolean(node)
    && typeof node === 'object'
    && (node.id != null || node.memberId != null || node.username || node.displayName);
}

export function isEmptyTeamTree(tree) {
  if (!tree) return true;
  if (hasRenderableTreeNode(tree)) return false;
  if (typeof tree !== 'object') return true;

  if (Object.prototype.hasOwnProperty.call(tree, 'root')) {
    return isEmptyTeamTree(tree.root);
  }

  if (Object.prototype.hasOwnProperty.call(tree, 'data')) {
    return isEmptyTeamTree(tree.data);
  }

  return Object.keys(tree).length === 0;
}

export function classifyTeamTreeError(error) {
  const reason = error?.details?.reason;

  if (reason === 'network') return 'network';
  if (reason === 'timeout') return 'timeout';
  if (reason === 'server') return 'server';
  if (reason === 'not_found') return 'not_found';

  const status = Number(error?.status || error?.statusCode || 0);
  if (status === 404) return 'not_found';
  if (status === 408) return 'timeout';
  if (status >= 500) return 'server';

  if (typeof window !== 'undefined' && window.navigator?.onLine === false) {
    return 'network';
  }

  return 'unknown';
}

export function getTeamTreeErrorState(error) {
  switch (classifyTeamTreeError(error)) {
    case 'network':
      return {
        kind: 'error',
        type: 'network',
        label: 'Network Error',
        message: TEAM_TREE_MESSAGES.network
      };
    case 'server':
      return {
        kind: 'error',
        type: 'server',
        label: 'Server Error',
        message: TEAM_TREE_MESSAGES.server
      };
    case 'timeout':
      return {
        kind: 'error',
        type: 'timeout',
        label: 'Request Timeout',
        message: TEAM_TREE_MESSAGES.timeout
      };
    case 'not_found':
      return {
        kind: 'empty',
        type: 'not_found',
        title: TEAM_TREE_MESSAGES.noData,
        description: TEAM_TREE_EMPTY_DESCRIPTION
      };
    default:
      return {
        kind: 'error',
        type: 'default',
        label: 'Team Tree Error',
        message: TEAM_TREE_MESSAGES.fallback
      };
  }
}

export function getEmptyTeamTreeState() {
  return {
    title: TEAM_TREE_MESSAGES.noData,
    description: TEAM_TREE_EMPTY_DESCRIPTION
  };
}
