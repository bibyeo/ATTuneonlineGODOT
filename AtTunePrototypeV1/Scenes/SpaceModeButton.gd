extends TextureButton

func _on_button_down() -> void:
	get_tree().change_scene_to_file("res://Scenes/space_level_select.tscn")
