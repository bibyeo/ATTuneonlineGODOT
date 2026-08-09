extends Node

# Autoloaded as "Sound". Two jobs:
#   1. Keep the right background track playing for whatever scene is open,
#      without restarting it when moving between scenes that share a track.
#   2. Play a click on every button in the game, wired automatically so new
#      scenes don't have to opt in.

const SCREEN1 := preload("res://Assets/Sound/screen1.ogg")
const SCREEN2 := preload("res://Assets/Sound/screen2.ogg")
const CLICK := preload("res://Assets/Sound/button_press.ogg")

# Scenes that use the screen 1 track.
const TRACK_ONE_SCENES := [
	"res://Scenes/SelectScreen.tscn",
	"res://Scenes/parent_mode.tscn",
]

# Scenes with their own audio, which play no background track at all.
const SILENT_SCENES := [
	"res://Scenes/cockpit_level.tscn",
	"res://Scenes/game_in_progress.tscn",
]

const MUSIC_VOLUME_DB := -8.0
const FADE_TIME := 0.4

var music: AudioStreamPlayer
var click: AudioStreamPlayer
var current_track: AudioStream = null
var last_scene_path := ""
var fade_tween: Tween = null

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS

	music = AudioStreamPlayer.new()
	music.volume_db = MUSIC_VOLUME_DB
	add_child(music)

	click = AudioStreamPlayer.new()
	click.stream = CLICK
	add_child(click)

	# Any button added anywhere, at any point, gets the click sound.
	get_tree().node_added.connect(_on_node_added)
	_wire_existing_buttons(get_tree().root)

func _process(_delta: float) -> void:
	var scene := get_tree().current_scene
	if scene == null:
		return
	var path := scene.scene_file_path
	if path == last_scene_path:
		return
	last_scene_path = path
	_apply_track_for(path)

func _apply_track_for(path: String) -> void:
	var wanted: AudioStream = SCREEN2
	if path in SILENT_SCENES:
		wanted = null
	elif path in TRACK_ONE_SCENES:
		wanted = SCREEN1

	if wanted == current_track:
		return  # already playing the right thing, let it continue uninterrupted
	current_track = wanted

	if wanted == null:
		_fade_out()
		return
	_play(wanted)

func _play(stream: AudioStream) -> void:
	if fade_tween != null and fade_tween.is_valid():
		fade_tween.kill()
	# Ogg streams import with looping off by default; these are background beds.
	if stream is AudioStreamOggVorbis:
		stream.loop = true
	music.stream = stream
	music.volume_db = -40.0
	music.play()
	fade_tween = create_tween()
	fade_tween.tween_property(music, "volume_db", MUSIC_VOLUME_DB, FADE_TIME)

func _fade_out() -> void:
	if fade_tween != null and fade_tween.is_valid():
		fade_tween.kill()
	fade_tween = create_tween()
	fade_tween.tween_property(music, "volume_db", -40.0, FADE_TIME)
	fade_tween.tween_callback(music.stop)

func play_click() -> void:
	click.play()

# --- automatic button wiring ---------------------------------------------

func _on_node_added(node: Node) -> void:
	if node is BaseButton:
		_wire(node)

func _wire_existing_buttons(node: Node) -> void:
	if node is BaseButton:
		_wire(node)
	for child in node.get_children():
		_wire_existing_buttons(child)

func _wire(button: BaseButton) -> void:
	if not button.button_down.is_connected(play_click):
		button.button_down.connect(play_click)
