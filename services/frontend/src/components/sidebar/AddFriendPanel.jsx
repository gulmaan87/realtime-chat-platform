export default function AddFriendPanel({
  addUsername,
  setAddUsername,
  addError,
  addSuccess,
  addLoading,
  onClose,
  onSubmit,
}) {
  return (
    <div className="add-friend-panel">
      <div className="add-friend-header">
        <h4>Add friend</h4>
        <button
          type="button"
          className="add-friend-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <form onSubmit={onSubmit} className="add-friend-form">
        <input
          type="text"
          placeholder="Enter username or email"
          value={addUsername}
          onChange={(e) => setAddUsername(e.target.value)}
          className="add-friend-input"
          autoFocus
          disabled={addLoading}
        />
        {addError ? <div className="add-friend-error">{addError}</div> : null}
        {addSuccess ? <div className="add-friend-success">{addSuccess}</div> : null}
        <button type="submit" className="add-friend-submit" disabled={addLoading}>
          {addLoading ? "Adding..." : "Add"}
        </button>
      </form>
    </div>
  );
}
