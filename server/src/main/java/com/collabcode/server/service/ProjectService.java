package com.collabcode.server.service;

import com.collabcode.server.entity.Project;
import com.collabcode.server.repository.ProjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ProjectService {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private FileSystemClient fileSystemClient;

    public Project create(Project project) {
        project.setCreatedAt(LocalDateTime.now());
        Project saved = projectRepository.save(project);

        // Create project folder in filesystem
        fileSystemClient.createProjectFolder(saved.getId());

        return saved;
    }

    public List<Project> getAll() {
        return projectRepository.findAll();
    }

    public Project getById(Long id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found"));
    }

    public Project update(Long id, Project updated) {
        Project existing = getById(id);
        existing.setName(updated.getName());
        existing.setOwner(updated.getOwner());
        return projectRepository.save(existing);
    }

    public void delete(Long id) {
        getById(id); // ensure exists

        // Delete project folder in filesystem
        fileSystemClient.deleteProjectFolder(id);

        projectRepository.deleteById(id);
    }
}
