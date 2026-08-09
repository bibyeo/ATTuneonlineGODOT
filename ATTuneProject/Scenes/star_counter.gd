extends Control

@onready var label: Label = $Label

func _ready() -> void:
	label.text = str(GameState.stars)

# Ticks the display up from an earlier total to the current one.
func count_up_from(start: int) -> void:
	var tween := create_tween()
	tween.tween_method(_set_display, float(start), float(GameState.stars), 0.8)

func _set_display(value: float) -> void:
	label.text = str(int(round(value)))
