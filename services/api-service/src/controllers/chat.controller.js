async function getChatHistory(req, res) {
  const { roomId } = req.params;

  // Placeholder for DB fetch (Week 6+)
  res.json({
    source: "db", // no Redis cache; all data currently comes from DB placeholder
    messages: [],
  });
}

module.exports = { getChatHistory };
