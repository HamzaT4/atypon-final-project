package com.collabcode.server.factory;

import com.collabcode.server.entity.Project;
import java.time.LocalDateTime;

/**
 * Factory class for creating Project instances.
 */
public class ProjectFactory {

    /**
     * Creates a new Project with the given name and owner.
     * The current timestamp is set as the creation time.
     *
     * @param name  The name of the project.
     * @param owner The owner of the project.
     * @return A new Project instance.
     */
    public static Project createProject(String name, String owner) {
        return new Project(name, owner, LocalDateTime.now());
    }
}
