package com.collabcode.server.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "project_user_roles")
public class ProjectUserRole {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String userId;
    private Long projectId;
    private String role; 

    public ProjectUserRole() {}

    public ProjectUserRole(String userId, Long projectId, String role) {
        this.userId = userId;
        this.projectId = projectId;
        this.role = role;
    }

    public Long getId() { return id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}
