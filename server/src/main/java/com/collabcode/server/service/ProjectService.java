package com.collabcode.server.service;

import com.collabcode.server.entity.Project;
import com.collabcode.server.entity.ProjectUserRole;
import com.collabcode.server.factory.ProjectFactory;
import com.collabcode.server.repository.ProjectRepository;
import com.collabcode.server.repository.ProjectUserRoleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ProjectService {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private FileSystemClient fileSystemClient;

    @Autowired
    private ProjectUserRoleRepository projectUserRoleRepository;

    /**
     * Original create method remains (if needed for other flows).
     */
    public Project create(Project projectInput) {
        Project project = ProjectFactory.createProject(projectInput.getName(), projectInput.getOwner());
        Project saved = projectRepository.save(project);
        fileSystemClient.createProjectFolder(saved.getId());
        return saved;
    }

    /**
     * Overloaded create method that uses the authenticated user's ID as the owner and creates a ProjectUserRole entry.
     *
     * @param projectInput The project data (name will be used).
     * @param userId       The authenticated GitHub user ID to set as the owner.
     * @return The saved Project with a new ProjectUserRole record.
     */
    public Project create(Project projectInput, String userId) {
        Project project = ProjectFactory.createProject(projectInput.getName(), userId);
        Project saved = projectRepository.save(project);

        fileSystemClient.createProjectFolder(saved.getId());

        ProjectUserRole pur = new ProjectUserRole(userId, saved.getId(), "admin");
        projectUserRoleRepository.save(pur);

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

    public List<Project> getProjectsByUser(String userId) {
        List<ProjectUserRole> roles = projectUserRoleRepository.findByUserId(userId);
        List<Project> projects = new ArrayList<>();
        for (ProjectUserRole role : roles) {
            projectRepository.findById(role.getProjectId()).ifPresent(projects::add);
        }
        return projects;
    }
}
