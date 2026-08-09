extends Control
var text
var password = "password"
func _on_line_edit_text_changed(new_text: String) -> void:
	text = new_text;


func _on_exit_button_down() -> void:
	queue_free();


func _on_enter_parent_mode_button_down() -> void:
	if(text == password):
		print("Password Accepted")
		get_tree().change_scene_to_file("res://Scenes/parental_controls_home.tscn")
	else:
		print("Password Incorrect")
