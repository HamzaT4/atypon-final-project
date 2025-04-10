package com.collabcode.server.service;

import com.collabcode.server.entity.Project;
import com.collabcode.server.repository.ProjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class ProjectService {

    @Autowired
    private ProjectRepository projectRepository;

    public Project createProject(Project project) {
        project.setCreatedAt(LocalDateTime.now());
        return projectRepository.save(project);
    }

    public List<Project> getAllProjects() {
        return projectRepository.findAll();
    }

    public Optional<Project> getProjectById(Long id) {
        return projectRepository.findById(id);
    }

    public Project updateProject(Long id, Project updatedProject) {
        return projectRepository.findById(id)
                .map(existing -> {
                    existing.setName(updatedProject.getName());
                    existing.setOwner(updatedProject.getOwner());
                    return projectRepository.save(existing);
                })
                .orElseThrow(() -> new RuntimeException("Project not found with ID: " + id));
    }

    public void deleteProject(Long id) {
        projectRepository.deleteById(id);
    }
}
