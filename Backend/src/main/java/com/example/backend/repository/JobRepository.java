package com.example.backend.repository;

import com.example.backend.model.Job;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JobRepository extends JpaRepository<Job, Long> {

    /**
     * Find all jobs with pagination
     */
    Page<Job> findAll(Pageable pageable);

    /**
     * Legacy methods for backward compatibility
     */
    List<Job> findByTitleContainingIgnoreCase(String keyword);

    List<Job> findByLocationContainingIgnoreCase(String location);

    List<Job> findBySourceIgnoreCase(String source);

    Page<Job> findBySourceIgnoreCase(String source, Pageable pageable);

    /**
     * Advanced search methods with pagination
     */
    
    /**
     * Search by keyword in title and description
     */
    @Query("SELECT j FROM Job j WHERE LOWER(j.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(j.description) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "ORDER BY j.postedTime DESC")
    Page<Job> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    /**
     * Search by location (case-insensitive, partial match)
     */
    @Query("SELECT j FROM Job j WHERE LOWER(j.location) LIKE LOWER(CONCAT('%', :location, '%')) " +
           "ORDER BY j.postedTime DESC")
    Page<Job> searchByLocation(@Param("location") String location, Pageable pageable);

    /**
     * Search by keyword AND location
     */
    @Query("SELECT j FROM Job j WHERE " +
           "(LOWER(j.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(j.description) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "AND LOWER(j.location) LIKE LOWER(CONCAT('%', :location, '%')) " +
           "ORDER BY j.postedTime DESC")
    Page<Job> searchByKeywordAndLocation(
        @Param("keyword") String keyword,
        @Param("location") String location,
        Pageable pageable
    );

    /**
     * Search by keyword AND location AND source
     */
    @Query("SELECT j FROM Job j WHERE " +
           "(LOWER(j.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(j.description) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "AND LOWER(j.location) LIKE LOWER(CONCAT('%', :location, '%')) " +
           "AND LOWER(j.source) = LOWER(:source) " +
           "ORDER BY j.postedTime DESC")
    Page<Job> searchByKeywordLocationAndSource(
        @Param("keyword") String keyword,
        @Param("location") String location,
        @Param("source") String source,
        Pageable pageable
    );

    /**
     * Search by company name
     */
    @Query("SELECT j FROM Job j WHERE LOWER(j.company) LIKE LOWER(CONCAT('%', :company, '%')) " +
           "ORDER BY j.postedTime DESC")
    Page<Job> searchByCompany(@Param("company") String company, Pageable pageable);

    /**
     * Flexible keyword search - matches title, description, or company
     * Returns results ordered by recency
     */
    @Query("SELECT j FROM Job j WHERE " +
           "LOWER(j.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(j.description) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(j.company) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "ORDER BY j.postedTime DESC")
    Page<Job> searchByKeywordFlexible(@Param("keyword") String keyword, Pageable pageable);

    /**
     * Search by location AND source (for generic category results)
     */
    @Query("SELECT j FROM Job j WHERE " +
           "LOWER(j.location) LIKE LOWER(CONCAT('%', :location, '%')) " +
           "AND LOWER(j.source) = LOWER(:source) " +
           "ORDER BY j.postedTime DESC")
    Page<Job> findByLocationAndSource(
        @Param("location") String location,
        @Param("source") String source,
        Pageable pageable
    );

    /**
     * Check if job exists (for deduplication) - title + company + source
     */
    @Query("SELECT CASE WHEN COUNT(j) > 0 THEN true ELSE false END FROM Job j " +
           "WHERE LOWER(j.title) = LOWER(:title) " +
           "AND LOWER(j.company) = LOWER(:company) " +
           "AND LOWER(j.source) = LOWER(:source)")
    boolean existsByTitleCompanyAndSource(
        @Param("title") String title,
        @Param("company") String company,
        @Param("source") String source
    );

    /**
     * Find jobs by title, company, and source for deduplication
     */
    @Query("SELECT j FROM Job j " +
           "WHERE LOWER(j.title) = LOWER(:title) " +
           "AND LOWER(j.company) = LOWER(:company) " +
           "AND LOWER(j.source) = LOWER(:source)")
    List<Job> findByTitleCompanyAndSource(
        @Param("title") String title,
        @Param("company") String company,
        @Param("source") String source
    );

    /**
     * Get count of jobs by source
     */
    @Query("SELECT COUNT(j) FROM Job j WHERE LOWER(j.source) = LOWER(:source)")
    long countBySource(@Param("source") String source);
}
