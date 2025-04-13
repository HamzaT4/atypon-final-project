package com.collabcode.server.factory;

import com.collabcode.server.entity.Folder;

/**
 * Factory class for creating Folder instances.
 */
public class FolderFactory {

    /**
     * Creates a new top-level Folder with the given name and project ID.
     *
     * @param name      The folder name.
     * @param projectId The associated project ID.
     * @return A new Folder instance.
     */
    public static Folder createFolder(String name, Long projectId) {
        return new Folder(name, projectId);
    }

    /**
     * Creates a new nested Folder with the given name, project ID, and parent folder ID.
     *
     * @param name      The folder name.
     * @param projectId The associated project ID.
     * @param parentId  The ID of the parent folder.
     * @return A new Folder instance with the specified parent.
     */
    public static Folder createFolder(String name, Long projectId, Long parentId) {
        return new Folder(name, projectId, parentId);
    }
}
