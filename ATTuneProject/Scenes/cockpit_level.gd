extends Control

# Level 2 — audio repair game. The player listens for a system's sound turning
# "wrong" and taps that system's button to fix it before the grace period runs out.
#
# Play alternates between two states:
#   NARRATION - a scripted briefing. The level clock is paused, nothing breaks,
#               and demo sounds play so the player learns what to listen for.
#   PLAYING   - normal play. The level clock runs and systems break on a timer.
# A narration runs before every phase, so the player gets a break each time a new
# system joins and again just before rapid fire.

const LEVEL_LENGTH := 300.0
const MAX_LIVES := 3

# Silence held when a system flips between its healthy and faulty clip, so the
# two never overlap or run straight into each other.
const HANDOVER := 0.5

# Life indicator colours: lit while the life is held, dark once it's spent.
const LIFE_ON := Color(1.0, 0.36, 0.24, 1.0)
const LIFE_OFF := Color(0.15, 0.15, 0.17, 1.0)

const STATE_NARRATION := 0
const STATE_PLAYING := 1

const NAV := 0
const ENGINE := 1
const FUEL := 2
const OXYGEN := 3

# Each phase runs until "until" seconds of play time have elapsed.
#   systems    - which systems are online and can break during this phase
#   gap        - random seconds between break attempts
#   grace      - how long a malfunction may sound before costing a life
#   max_broken - how many systems may be broken at once
const PHASES := [
	{"until":  30.0, "systems": [NAV],                        "gap": [5.0, 8.0], "grace": 5.0, "max_broken": 1},
	{"until":  60.0, "systems": [NAV, ENGINE],                "gap": [5.0, 8.0], "grace": 5.0, "max_broken": 1},
	{"until": 120.0, "systems": [NAV, ENGINE, FUEL],          "gap": [4.0, 7.0], "grace": 5.0, "max_broken": 2},
	{"until": 180.0, "systems": [NAV, ENGINE, FUEL, OXYGEN],  "gap": [3.0, 6.0], "grace": 5.0, "max_broken": 3},
	{"until": 300.0, "systems": [NAV, ENGINE, FUEL, OXYGEN],  "gap": [0.5, 2.0], "grace": 5.0, "max_broken": 4},
]

# One entry per phase. Each line shows for "hold" seconds and may trigger a demo
# sound: "demo" is the system index, "broken" picks the healthy or faulty clip.
# The opening briefing is longer; every later break totals 10 seconds.
const NARRATIONS := [
	[
		{"text": "Your ship runs on four systems.\nKeep them all working.", "hold": 4.0},
		{"text": "This is navigation, working normally.", "hold": 4.5, "demo": NAV, "broken": false},
		{"text": "This is navigation in trouble.\nIt chimes twice instead of once.", "hold": 5.0, "demo": NAV, "broken": true},
		{"text": "When you hear a system go wrong,\ntap its button to fix it.", "hold": 4.5},
		{"text": "Leave it too long and you lose a life.\nYou have three.", "hold": 4.0},
	],
	[
		{"text": "The engine is coming online.\nA healthy engine is a low rumble.", "hold": 5.0, "demo": ENGINE, "broken": false},
		{"text": "If it turns into a high rumble,\nthe engine needs fixing.", "hold": 5.0, "demo": ENGINE, "broken": true},
	],
	[
		{"text": "Fuel system online.\nHealthy valves turn steadily.", "hold": 5.0, "demo": FUEL, "broken": false},
		{"text": "If the valve sounds stuck,\nthe fuel system needs fixing.", "hold": 5.0, "demo": FUEL, "broken": true},
	],
	[
		{"text": "Oxygen online.\nHealthy oxygen sounds like open wind.", "hold": 5.0, "demo": OXYGEN, "broken": false},
		{"text": "If it starts to whistle like a kettle,\noxygen needs fixing.", "hold": 5.0, "demo": OXYGEN, "broken": true},
	],
	[
		{"text": "Warning — all four systems are\nnow failing much faster.", "hold": 5.0},
		{"text": "Several can break at once.\nKeep listening and fix them quickly.", "hold": 5.0},
	],
]

class SystemState:
	var player: AudioStreamPlayer
	var normal: AudioStream
	var broken: AudioStream
	var normal_plays: int
	var broken_plays: int
	var normal_gap: float
	var broken_gap: float
	var active := false
	var is_broken := false
	var broken_for := 0.0
	var cue := 0.0
	var plays_left := 0

var systems: Array[SystemState] = []
var elapsed := 0.0
var lives := MAX_LIVES
var next_break := 0.0
var finished := false

var state := STATE_NARRATION
var phase_index := 0
var narration_lines: Array = []
var narration_step := 0
var line_timer := 0.0
var ready_tween: Tween = null
var shake_tween: Tween = null

@onready var life_dots: Array[ColorRect] = [
	$LivesDisplay/Life1, $LivesDisplay/Life2, $LivesDisplay/Life3,
]
@onready var red_flash: ColorRect = $RedFlash
@onready var fade_out: ColorRect = $FadeOut
@onready var narration_overlay: Control = $NarrationOverlay
@onready var narration_label: Label = $NarrationOverlay/Text
@onready var ready_light: TextureRect = $ReadyLight

func _ready() -> void:
	_add_system($NavAudio,
		preload("res://Assets/Sound/Level2/nav.ogg"),
		preload("res://Assets/Sound/Level2/nav_broken.ogg"),
		1, 1, 3.0, 1.2)
	_add_system($EngineAudio,
		preload("res://Assets/Sound/Level2/engine_normal.ogg"),
		preload("res://Assets/Sound/Level2/engine_broken.ogg"),
		1, 1, 0.0, 0.0)
	_add_system($FuelAudio,
		preload("res://Assets/Sound/Level2/fuel_normal.ogg"),
		preload("res://Assets/Sound/Level2/fuel_broken.ogg"),
		1, 1, 2.0, 0.4)
	_add_system($OxygenAudio,
		preload("res://Assets/Sound/Level2/oxygen_normal.ogg"),
		preload("res://Assets/Sound/Level2/oxygen_broken.ogg"),
		1, 1, 0.0, 0.0)

	_update_lives()
	$Ambience.play()
	_start_narration(0)

func _add_system(player: AudioStreamPlayer, normal: AudioStream, broken: AudioStream,
		normal_plays: int, broken_plays: int, normal_gap: float, broken_gap: float) -> void:
	var s := SystemState.new()
	s.player = player
	s.normal = normal
	s.broken = broken
	s.normal_plays = normal_plays
	s.broken_plays = broken_plays
	s.normal_gap = normal_gap
	s.broken_gap = broken_gap
	s.plays_left = normal_plays
	systems.append(s)

func _process(delta: float) -> void:
	if finished:
		return
	if state == STATE_NARRATION:
		_tick_narration(delta)
		return

	elapsed += delta
	if elapsed >= LEVEL_LENGTH:
		_win()
		return

	# Crossing into a new phase pauses play for that phase's briefing.
	var idx := _phase_index_for(elapsed)
	if idx != phase_index:
		_start_narration(idx)
		return

	var phase: Dictionary = PHASES[phase_index]
	for s in systems:
		_tick_audio(s, delta)
	_tick_damage(phase, delta)
	_tick_scheduler(phase, delta)

func _phase_index_for(time: float) -> int:
	for i in PHASES.size():
		if time < float(PHASES[i]["until"]):
			return i
	return PHASES.size() - 1

# --- narration ------------------------------------------------------------

func _start_narration(idx: int) -> void:
	state = STATE_NARRATION
	phase_index = idx
	# Clear the board so nothing is quietly broken while the player is listening.
	for s in systems:
		_repair(s)
		s.player.stop()
	_set_active_systems(PHASES[idx] as Dictionary)

	narration_lines = NARRATIONS[idx] as Array
	narration_step = -1
	line_timer = 0.0
	narration_overlay.visible = true

func _tick_narration(delta: float) -> void:
	line_timer -= delta
	if line_timer > 0.0:
		return
	narration_step += 1
	if narration_step >= narration_lines.size():
		_end_narration()
		return
	var line: Dictionary = narration_lines[narration_step]
	narration_label.text = line["text"]
	line_timer = float(line["hold"])
	if line.has("demo"):
		for other in systems:
			other.player.stop()
		var s := systems[int(line["demo"])]
		s.player.stream = s.broken if bool(line["broken"]) else s.normal
		s.player.play()

func _end_narration() -> void:
	narration_overlay.visible = false
	state = STATE_PLAYING
	for s in systems:
		s.player.stop()
		s.cue = randf_range(0.0, 1.5)  # stagger so the loops don't start in lockstep
	next_break = randf_range(3.0, 6.0)

func _set_active_systems(phase: Dictionary) -> void:
	for s in systems:
		s.active = false
	for i in phase["systems"]:
		systems[i].active = true

# --- play -----------------------------------------------------------------

# Replays a system's current clip on a loop, with a gap between cycles.
func _tick_audio(s: SystemState, delta: float) -> void:
	if not s.active:
		return
	s.cue -= delta
	if s.cue > 0.0:
		return
	# A broken system plays only its fault clip; the healthy clip is suppressed
	# entirely until the player fixes it.
	var stream: AudioStream = s.broken if s.is_broken else s.normal
	s.player.stream = stream
	s.player.play()
	s.plays_left -= 1
	if s.plays_left > 0:
		s.cue = stream.get_length()
	else:
		s.plays_left = s.broken_plays if s.is_broken else s.normal_plays
		s.cue = stream.get_length() + (s.broken_gap if s.is_broken else s.normal_gap)

func _tick_damage(phase: Dictionary, delta: float) -> void:
	for s in systems:
		if not s.is_broken:
			continue
		s.broken_for += delta
		if s.broken_for >= float(phase["grace"]):
			_lose_life(s)
			return

func _tick_scheduler(phase: Dictionary, delta: float) -> void:
	next_break -= delta
	if next_break > 0.0:
		return
	var gap: Array = phase["gap"]
	next_break = randf_range(gap[0], gap[1])

	var broken_count := 0
	for s in systems:
		if s.is_broken:
			broken_count += 1
	if broken_count >= int(phase["max_broken"]):
		return

	var candidates: Array = []
	for i in phase["systems"]:
		if not systems[i].is_broken:
			candidates.append(i)
	if candidates.is_empty():
		return
	_break_system(systems[candidates.pick_random()])

func _break_system(s: SystemState) -> void:
	s.is_broken = true
	# Start the clock when the fault becomes audible, not when it's scheduled,
	# so the handover silence doesn't eat into the player's window.
	s.broken_for = -HANDOVER
	s.plays_left = s.broken_plays
	s.player.stop()      # cut the healthy clip mid-play
	s.cue = HANDOVER     # then leave a clear gap before the faulty one starts

func _repair(s: SystemState) -> void:
	s.is_broken = false
	s.broken_for = 0.0
	s.plays_left = s.normal_plays
	s.player.stop()
	s.cue = HANDOVER

func _try_fix(index: int) -> void:
	if finished or state != STATE_PLAYING:
		return
	var s := systems[index]
	if s.is_broken:
		_repair(s)
		_show_ready()

# Flashes READY in the cockpit's centre display after a successful fix.
func _show_ready() -> void:
	if ready_tween != null and ready_tween.is_valid():
		ready_tween.kill()   # rapid fixes shouldn't stack competing tweens
	var tween := create_tween()
	ready_tween = tween
	tween.tween_property(ready_light, "modulate:a", 1.0, 0.08)
	tween.tween_interval(0.7)
	tween.tween_property(ready_light, "modulate:a", 0.0, 0.35)

func _lose_life(s: SystemState) -> void:
	_repair(s)  # the system repairs itself once it has cost a life
	lives -= 1
	_update_lives()
	_flash_red()
	_shake()
	if lives <= 0:
		_game_over()

func _update_lives() -> void:
	for i in life_dots.size():
		life_dots[i].color = LIFE_ON if i < lives else LIFE_OFF

func _flash_red() -> void:
	red_flash.color.a = 0.0
	var tween := create_tween()
	tween.tween_property(red_flash, "color:a", 0.55, 0.12)
	tween.tween_property(red_flash, "color:a", 0.0, 0.45)

# Short, decaying knock to sell the hit. Runs alongside the red flash.
func _shake(duration := 0.4, strength := 9.0) -> void:
	if shake_tween != null and shake_tween.is_valid():
		shake_tween.kill()
	var tween := create_tween()
	shake_tween = tween
	var steps := 8
	var step_time := duration / float(steps + 1)
	for i in steps:
		var falloff := 1.0 - float(i) / float(steps)
		var offset := Vector2(randf_range(-1.0, 1.0), randf_range(-1.0, 1.0)) * strength * falloff
		tween.tween_property(self, "position", offset, step_time)
	tween.tween_property(self, "position", Vector2.ZERO, step_time)

func _stop_audio() -> void:
	$Ambience.stop()
	for s in systems:
		s.player.stop()

func _game_over() -> void:
	finished = true
	_stop_audio()
	var tween := create_tween()
	tween.tween_property(fade_out, "color:a", 1.0, 1.2)
	tween.tween_callback(func() -> void:
		get_tree().change_scene_to_file("res://Scenes/game_over.tscn"))

func _win() -> void:
	finished = true
	_stop_audio()
	get_tree().change_scene_to_file("res://Scenes/level2_complete.tscn")

func _on_navigation_button_down() -> void: _try_fix(NAV)
func _on_engine_button_down() -> void:     _try_fix(ENGINE)
func _on_fuel_button_down() -> void:       _try_fix(FUEL)
func _on_oxygen_button_down() -> void:     _try_fix(OXYGEN)

func _on_back_button_down() -> void:
	finished = true
	_stop_audio()
	get_tree().change_scene_to_file("res://Scenes/level2_intro.tscn")
