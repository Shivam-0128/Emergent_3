export const StatusTag = ({ shared, testId }) => (
  <span data-testid={testId}
    className={`uppercase tracking-wider text-xs px-3 py-1 rounded-full font-medium border ${
      shared ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-stone-100 text-stone-700 border-stone-200"
    }`}>
    {shared ? "Shared" : "Private"}
  </span>
);
