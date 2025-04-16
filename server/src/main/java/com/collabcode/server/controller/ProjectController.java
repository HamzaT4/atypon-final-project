package com.collabcode.server.controller;

import com.collabcode.server.entity.Project;
import com.collabcode.server.service.ProjectService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    @Autowired
    private ProjectService projectService;

    // Updated create endpoint to take OAuth2AuthenticationToken,
    // so that the authenticated user's GitHub ID is used.
    @PostMapping
    public ResponseEntity<Project> createProject(@RequestBody Project project, OAuth2AuthenticationToken authentication) {
        // Extract GitHub user ID from authentication attributes.
        String userId = authentication.getPrincipal().getAttribute("id").toString();
        Project createdProject = projectService.create(project, userId);
        return ResponseEntity.ok(createdProject);
    }

    @GetMapping
    public ResponseEntity<List<Project>> getAllProjects() {
        return ResponseEntity.ok(projectService.getAll());
    }

    @GetMapping("/mine")
    public ResponseEntity<List<Project>> getMyProjects(OAuth2AuthenticationToken authentication) {
        String userId = authentication.getPrincipal().getAttribute("id").toString();
        List<Project> projects = projectService.getProjectsByUser(userId);
        return ResponseEntity.ok(projects);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Project> getProject(@PathVariable Long id) {
        return ResponseEntity.ok(projectService.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Project> updateProject(@PathVariable Long id, @RequestBody Project updated) {
        return ResponseEntity.ok(projectService.update(id, updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject(@PathVariable Long id) {
        projectService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
