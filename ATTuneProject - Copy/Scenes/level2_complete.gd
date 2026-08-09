extends Control

const LEVEL_ID := "space_2"
const REWARD := 3

func _ready() -> void:
	GameState.award(LEVEL_ID, REWARD)

func _on_continue_button_down() -> void:
	get_tree().change_scene_to_file("res://Scenes/space_level_select.tscn")

func _on_back_button_down() -> void:
	get_tree().change_scene_to_file("res://Scenes/space_level_select.tscn")
