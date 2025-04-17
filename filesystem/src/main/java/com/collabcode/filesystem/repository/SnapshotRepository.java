package com.collabcode.filesystem.repository;

import com.collabcode.filesystem.entity.Snapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * SnapshotRepository now lets us query by filename exactly,
 * since filename in the DB holds only the fileId.
 */
public interface SnapshotRepository extends JpaRepository<Snapshot, Long> {
    List<Snapshot> findByFilename(String filename);
}
