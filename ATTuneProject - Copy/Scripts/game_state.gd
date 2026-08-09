extends Node

# Autoloaded as "GameState". Holds the player's star total and which levels
# have already paid out, saved to disk so it survives restarts.

const SAVE_PATH := "user://save.cfg"

var stars := 0
var completed: Dictionary = {}

func _ready() -> void:
	load_game()

# Awards stars for a level the first time it's beaten.
# Returns how many were actually granted (0 if already earned).
func award(level_id: String, amount: int) -> int:
	if completed.has(level_id):
		return 0
	completed[level_id] = amount
	stars += amount
	save_game()
	return amount

func save_game() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("progress", "stars", stars)
	cfg.set_value("progress", "completed", completed)
	cfg.save(SAVE_PATH)

func load_game() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(SAVE_PATH) != OK:
		return
	stars = cfg.get_value("progress", "stars", 0)
	completed = cfg.get_value("progress", "completed", {})
