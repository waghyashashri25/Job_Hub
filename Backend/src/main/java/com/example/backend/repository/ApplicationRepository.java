package com.example.backend.repository;

import com.example.backend.model.Application;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, Long> {

    @EntityGraph(attributePaths = {"job", "user"})
    List<Application> findByUserIdOrderBySavedAtDesc(Long userId);

    @EntityGraph(attributePaths = {"job", "user"})
    Optional<Application> findByUserIdAndJobId(Long userId, Long jobId);

    @EntityGraph(attributePaths = {"job", "user"})
    List<Application> findTop50ByOrderBySavedAtDesc();

    @EntityGraph(attributePaths = {"job", "user"})
    @org.springframework.data.jpa.repository.Query("SELECT a FROM Application a WHERE LOWER(a.job.postedByEmail) = LOWER(:postedByEmail) ORDER BY a.savedAt DESC")
    List<Application> findByJobPostedByEmailOrderBySavedAtDesc(@org.springframework.data.repository.query.Param("postedByEmail") String postedByEmail);

    @EntityGraph(attributePaths = {"job", "user"})
    List<Application> findByJobIdOrderBySavedAtDesc(Long jobId);
}
