package com.collabcode.server.repository;

import com.collabcode.server.entity.ProjectUserRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectUserRoleRepository extends JpaRepository<ProjectUserRole, Long> {
    List<ProjectUserRole> findByProjectId(Long projectId);
    List<ProjectUserRole> findByUserId(String userId);
    ProjectUserRole findByUserIdAndProjectId(String userId, Long projectId);
}
