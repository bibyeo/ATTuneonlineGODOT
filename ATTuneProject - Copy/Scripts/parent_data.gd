extends Node

# Autoloaded as "ParentData". Holds the ABC chart setup and every logged
# behaviour entry, saved to disk so the parent's log survives restarts.

const SAVE_PATH := "user://parent_data.cfg"

# --- ABC chart setup ------------------------------------------------------
var child_name := ""
var child_age := ""
var diagnosis := ""
var tracked_behaviours: Array = []
var tracked_antecedents: Array = []
var tracked_times: Array = []
var tracked_consequences: Array = []
var typical_duration := "5-15 minutes"
var typical_intensity := 3
var setup_done := false

# --- logged entries -------------------------------------------------------
# Each entry: {id, time (unix), activity, antecedent, behaviour, severity, consequence, note}
var entries: Array = []
var next_id := 1

func _ready() -> void:
	# Parent mode is session-only: every app launch starts with an empty log
	# and a blank ABC chart setup. Call load_data() here instead to persist.
	reset_all()

# Clears the behaviour log.
func reset_entries() -> void:
	entries.clear()
	next_id = 1

# Clears the log and the ABC chart setup, then wipes the save file.
func reset_all() -> void:
	reset_entries()
	child_name = ""
	child_age = ""
	diagnosis = ""
	tracked_behaviours.clear()
	tracked_antecedents.clear()
	tracked_times.clear()
	tracked_consequences.clear()
	typical_duration = "5-15 minutes"
	typical_intensity = 3
	setup_done = false
	save_data()

func add_entry(entry: Dictionary) -> Dictionary:
	entry["id"] = next_id
	next_id += 1
	entries.push_front(entry)  # newest first
	save_data()
	return entry

func get_entry(id: int) -> Dictionary:
	for e in entries:
		if int(e["id"]) == id:
			return e
	return {}

func delete_entry(id: int) -> void:
	for i in range(entries.size()):
		if int(entries[i]["id"]) == id:
			entries.remove_at(i)
			save_data()
			return

# Entries logged in the last 7 days.
func entries_this_week() -> int:
	var cutoff := Time.get_unix_time_from_system() - 7 * 86400
	var count := 0
	for e in entries:
		if float(e["time"]) >= cutoff:
			count += 1
	return count

func average_intensity() -> float:
	if entries.is_empty():
		return 0.0
	var total := 0.0
	for e in entries:
		total += float(e["severity"])
	return total / float(entries.size())

# How many entries fall on each of the last "weeks" seven-day blocks, oldest first.
func weekly_counts(weeks: int = 6) -> Array:
	var now := Time.get_unix_time_from_system()
	var buckets: Array = []
	for i in range(weeks):
		buckets.append(0)
	for e in entries:
		var age: float = now - float(e["time"])
		var week_index := int(age / (7 * 86400))
		if week_index < weeks:
			buckets[weeks - 1 - week_index] += 1
	return buckets

# Counts grouped into the time-of-day bands shown on the insights screen.
func time_of_day_counts() -> Array:
	var bands := [0, 0, 0, 0, 0]  # 7-9, 9-12, 12-3, 3-6, 6-9
	for e in entries:
		var hour := int(Time.get_datetime_dict_from_unix_time(int(e["time"]))["hour"])
		if hour < 9:
			bands[0] += 1
		elif hour < 12:
			bands[1] += 1
		elif hour < 15:
			bands[2] += 1
		elif hour < 18:
			bands[3] += 1
		else:
			bands[4] += 1
	return bands

# Antecedents ranked by how often they appear, as [[label, count], ...].
func top_triggers(limit: int = 5) -> Array:
	var tally: Dictionary = {}
	for e in entries:
		var a: String = str(e["antecedent"])
		if a == "":
			continue
		tally[a] = int(tally.get(a, 0)) + 1
	var rows: Array = []
	for key in tally.keys():
		rows.append([key, tally[key]])
	rows.sort_custom(func(a, b): return int(a[1]) > int(b[1]))
	return rows.slice(0, limit)

func save_data() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("setup", "child_name", child_name)
	cfg.set_value("setup", "child_age", child_age)
	cfg.set_value("setup", "diagnosis", diagnosis)
	cfg.set_value("setup", "behaviours", tracked_behaviours)
	cfg.set_value("setup", "antecedents", tracked_antecedents)
	cfg.set_value("setup", "times", tracked_times)
	cfg.set_value("setup", "consequences", tracked_consequences)
	cfg.set_value("setup", "duration", typical_duration)
	cfg.set_value("setup", "intensity", typical_intensity)
	cfg.set_value("setup", "done", setup_done)
	cfg.set_value("log", "entries", entries)
	cfg.set_value("log", "next_id", next_id)
	cfg.save(SAVE_PATH)

func load_data() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(SAVE_PATH) != OK:
		return
	child_name = cfg.get_value("setup", "child_name", "")
	child_age = cfg.get_value("setup", "child_age", "")
	diagnosis = cfg.get_value("setup", "diagnosis", "")
	tracked_behaviours = cfg.get_value("setup", "behaviours", [])
	tracked_antecedents = cfg.get_value("setup", "antecedents", [])
	tracked_times = cfg.get_value("setup", "times", [])
	tracked_consequences = cfg.get_value("setup", "consequences", [])
	typical_duration = cfg.get_value("setup", "duration", "5-15 minutes")
	typical_intensity = cfg.get_value("setup", "intensity", 3)
	setup_done = cfg.get_value("setup", "done", false)
	entries = cfg.get_value("log", "entries", [])
	next_id = cfg.get_value("log", "next_id", 1)
