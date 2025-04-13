package com.collabcode.server.service;

import com.collabcode.server.entity.Project;
import com.collabcode.server.factory.ProjectFactory;
import com.collabcode.server.repository.ProjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProjectService {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private FileSystemClient fileSystemClient;

    /**
     * Creates a new Project by using the ProjectFactory to instantiate the object,
     * then saves it to the repository and creates its corresponding folder in the filesystem.
     *
     * @param projectInput A Project object containing at least the name and owner.
     * @return The saved Project with generated creation timestamp and persisted folder.
     */
    public Project create(Project projectInput) {
        // Instead of setting the createdAt timestamp manually,
        // delegate the creation to the factory.
        Project project = ProjectFactory.createProject(projectInput.getName(), projectInput.getOwner());
        
        Project saved = projectRepository.save(project);

        // Create project folder in the filesystem using the newly saved project's ID.
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
        getById(id);

        fileSystemClient.deleteProjectFolder(id);

        projectRepository.deleteById(id);
    }
}
