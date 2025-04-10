package com.collabcode.server.controller;

import com.collabcode.server.entity.ProjectUserRole;
import com.collabcode.server.service.ProjectUserRoleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/project-user-roles")
public class ProjectUserRoleController {

    @Autowired
    private ProjectUserRoleService projectUserRoleService;

    @PostMapping
    public ResponseEntity<ProjectUserRole> addRole(@RequestBody ProjectUserRole pur) {
        return ResponseEntity.ok(projectUserRoleService.addRole(pur));
    }

    @GetMapping
    public ResponseEntity<List<ProjectUserRole>> getAllRoles() {
        return ResponseEntity.ok(projectUserRoleService.getAllRoles());
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<ProjectUserRole>> getRolesByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(projectUserRoleService.getRolesByProject(projectId));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ProjectUserRole>> getRolesByUser(@PathVariable String userId) {
        return ResponseEntity.ok(projectUserRoleService.getRolesByUser(userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removeRole(@PathVariable Long id) {
        projectUserRoleService.removeRole(id);
        return ResponseEntity.noContent().build();
    }
}
