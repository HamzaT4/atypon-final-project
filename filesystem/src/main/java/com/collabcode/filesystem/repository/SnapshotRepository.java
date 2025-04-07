package com.collabcode.filesystem.repository;

import com.collabcode.filesystem.entity.Snapshot;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SnapshotRepository extends JpaRepository<Snapshot, Long> {
}
