package com.collabcode.server.service;

import com.collabcode.server.entity.ProjectUserRole;
import com.collabcode.server.repository.ProjectUserRoleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProjectUserRoleService {

    @Autowired
    private ProjectUserRoleRepository projectUserRoleRepository;

    public ProjectUserRole addRole(ProjectUserRole pur) {
        return projectUserRoleRepository.save(pur);
    }

    public List<ProjectUserRole> getAllRoles() {
        return projectUserRoleRepository.findAll();
    }

    public List<ProjectUserRole> getRolesByProject(Long projectId) {
        return projectUserRoleRepository.findByProjectId(projectId);
    }

    public List<ProjectUserRole> getRolesByUser(String userId) {
        return projectUserRoleRepository.findByUserId(userId);
    }

    public void removeRole(Long id) {
        projectUserRoleRepository.deleteById(id);
    }
}
