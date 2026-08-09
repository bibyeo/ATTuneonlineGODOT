extends Control

@onready var video: VideoStreamPlayer = $Video
@onready var progress_fill: ColorRect = $ProgressTrack/ProgressFill

const TRACK_WIDTH := 600.0
const FALLBACK_LENGTH := 300.67

var total_length := FALLBACK_LENGTH

func _ready() -> void:
	# Theora may report 0 depending on the Godot build, so fall back to a constant.
	var reported := video.get_stream_length()
	if reported > 0.0:
		total_length = reported
	video.finished.connect(_on_video_finished)
	video.play()

func _process(_delta: float) -> void:
	var t: float = clampf(video.stream_position / total_length, 0.0, 1.0)
	progress_fill.size.x = TRACK_WIDTH * t

func _on_seek_area_gui_input(event: InputEvent) -> void:
	var x := -1.0
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		x = event.position.x
	elif event is InputEventScreenTouch and event.pressed:
		x = event.position.x
	if x < 0.0:
		return
	var t: float = clampf(x / TRACK_WIDTH, 0.0, 1.0)
	video.stream_position = t * total_length

func _on_video_finished() -> void:
	get_tree().change_scene_to_file("res://Scenes/training_complete.tscn")

func _on_back_button_down() -> void:
	video.stop()
	get_tree().change_scene_to_file("res://Scenes/training_intro.tscn")
