extends Control

func _on_start_button_down() -> void:
	get_tree().change_scene_to_file("res://Scenes/cockpit_level.tscn")

func _on_back_button_down() -> void:
	get_tree().change_scene_to_file("res://Scenes/space_level_select.tscn")
