import React from 'react';

export default function ActiveIssuesView({ issues, onAssign }) {
  const activeIssues = issues.filter(i => i.status !== 'completed');

  return (
    <div className="space-y-4">
      {activeIssues.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">No active issues</p>
        </div>
      ) : (
        activeIssues.map(issue => (
          <div
            key={issue._id}
            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">{issue.title}</h3>
              <span
                className={`px-2 py-1 text-xs font-medium rounded ${
                  issue.priority === 'high'
                    ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                    : issue.priority === 'medium'
                    ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                    : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                }`}
              >
                {issue.priority?.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{issue.description}</p>
            <div className="flex justify-between items-center">
              <span
                className={`text-xs font-medium px-2 py-1 rounded ${
                  issue.status === 'open'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                    : 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                }`}
              >
                {issue.status?.toUpperCase()}
              </span>
              {!issue.assigneeId && (
                <button
                  onClick={() => onAssign(issue._id, 'user1')}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  Assign
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
