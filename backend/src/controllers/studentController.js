const { query } = require('../config/db');
const dsaService = require('../services/dsaService');
const aiService = require('../services/ai/aiService');
const { calculateProfileCompletion } = require('../utils/profileCompletion');

async function getStudentDashboard(req, res) {
  try {
    const sRes = await query('SELECT * FROM students WHERE user_id = $1', [req.user.id]);
    if (sRes.length === 0) {
      return res.status(404).json({ success: false, error: 'Student profile not found.' });
    }
    const student = sRes[0];

    // Fetch skills
    const skillsRes = await query(
      `SELECT sk.name FROM student_skills ss JOIN skills sk ON ss.skill_id = sk.id WHERE ss.student_id = $1`,
      [student.id]
    );
    student.skills = skillsRes.map(s => s.name);

    // Fetch projects
    const projectsRes = await query('SELECT * FROM projects WHERE student_id = $1', [student.id]);
    student.projects = projectsRes;

    // Calculate real dynamic profile completion
    const completionDetails = calculateProfileCompletion(student, student.skills, student.projects);
    student.profile_completion = completionDetails.percentage;

    // Keep DB synchronized with calculated percentage
    await query('UPDATE students SET profile_completion = $1 WHERE id = $2', [completionDetails.percentage, student.id]);

    // Fetch stats
    const totalApps = await query('SELECT COUNT(*) as cnt FROM applications WHERE student_id = $1', [student.id]);
    const shortlisted = await query("SELECT COUNT(*) as cnt FROM applications WHERE student_id = $1 AND status = 'SHORTLISTED'", [student.id]);
    const selected = await query("SELECT COUNT(*) as cnt FROM applications WHERE student_id = $1 AND status = 'SELECTED'", [student.id]);
    const pending = await query("SELECT COUNT(*) as cnt FROM applications WHERE student_id = $1 AND status IN ('APPLIED', 'UNDER_REVIEW')", [student.id]);
    const rejected = await query("SELECT COUNT(*) as cnt FROM applications WHERE student_id = $1 AND status = 'REJECTED'", [student.id]);
    const saved = await query('SELECT COUNT(*) as cnt FROM bookmarks WHERE student_id = $1', [student.id]);
    const totalInternshipsRes = await query('SELECT COUNT(*) as cnt FROM internships WHERE is_published = 1');

    const totalCount = parseInt(totalApps[0]?.cnt || totalApps[0]?.CNT || 0, 10);
    const selectedCount = parseInt(selected[0]?.cnt || selected[0]?.CNT || 0, 10);
    const pendingCount = parseInt(pending[0]?.cnt || pending[0]?.CNT || 0, 10);
    const rejectedCount = parseInt(rejected[0]?.cnt || rejected[0]?.CNT || 0, 10);
    const shortlistedCount = parseInt(shortlisted[0]?.cnt || shortlisted[0]?.CNT || 0, 10);
    const savedCount = parseInt(saved[0]?.cnt || saved[0]?.CNT || 0, 10);
    const totalAvailableInternships = parseInt(totalInternshipsRes[0]?.cnt || totalInternshipsRes[0]?.CNT || 0, 10);
    const successRate = totalCount > 0 ? Math.round((selectedCount / totalCount) * 100) : 0;

    // Real Application Status Distribution
    const statusDistRaw = await query(
      `SELECT status, COUNT(*) as count FROM applications WHERE student_id = $1 GROUP BY status`,
      [student.id]
    );
    const statusDistribution = statusDistRaw.map(r => ({
      name: r.status,
      value: parseInt(r.count || r.COUNT || 0, 10)
    }));

    // Real Internship Domain / Category Distribution
    const domainDistRaw = await query(
      `SELECT domain, COUNT(*) as count FROM internships WHERE is_published = 1 GROUP BY domain ORDER BY count DESC LIMIT 6`
    );
    const categoryDistribution = domainDistRaw.map(r => ({
      category: r.domain,
      count: parseInt(r.count || r.COUNT || 0, 10)
    }));

    // Real Application Trends over time (grouped by month)
    const allAppsRaw = await query(
      `SELECT applied_at FROM applications WHERE student_id = $1 ORDER BY applied_at ASC`,
      [student.id]
    );
    const monthCounts = {};
    for (const app of allAppsRaw) {
      const d = new Date(app.applied_at || Date.now());
      const monthLabel = d.toLocaleString('en-US', { month: 'short' });
      monthCounts[monthLabel] = (monthCounts[monthLabel] || 0) + 1;
    }
    const applicationTrends = Object.keys(monthCounts).map(m => ({
      month: m,
      applications: monthCounts[m]
    }));

    // Fetch upcoming interviews
    const interviews = await query(
      `SELECT iv.*, i.title as internship_title, c.company_name, c.logo_url
       FROM interviews iv
       JOIN internships i ON iv.internship_id = i.id
       JOIN companies c ON iv.company_id = c.id
       WHERE iv.student_id = $1 AND iv.status = 'SCHEDULED'
       ORDER BY iv.scheduled_at ASC LIMIT 5`,
      [student.id]
    );

    // Fetch recommendations using C++ DSA Service
    const allInternships = await query(
      `SELECT i.*, c.company_name, c.logo_url FROM internships i JOIN companies c ON i.company_id = c.id WHERE i.is_published = 1 LIMIT 15`
    );

    for (const intern of allInternships) {
      const sks = await query(
        `SELECT sk.name FROM internship_skills isk JOIN skills sk ON isk.skill_id = sk.id WHERE isk.internship_id = $1`,
        [intern.id]
      );
      intern.required_skills = sks.map(s => s.name);
    }

    const dsaMatchRes = await dsaService.matchInternships(student, allInternships);

    // Fetch recent applications
    const recentApps = await query(
      `SELECT a.*, i.title, i.domain, c.company_name, c.logo_url
       FROM applications a
       JOIN internships i ON a.internship_id = i.id
       JOIN companies c ON i.company_id = c.id
       WHERE a.student_id = $1 ORDER BY a.applied_at DESC LIMIT 5`,
      [student.id]
    );

    return res.json({
      success: true,
      stats: {
        totalApplications: totalCount,
        pending: pendingCount,
        shortlisted: shortlistedCount,
        selected: selectedCount,
        rejected: rejectedCount,
        savedInternships: savedCount,
        totalAvailableInternships,
        successRate,
        profileCompletion: completionDetails.percentage
      },
      statusDistribution,
      categoryDistribution,
      applicationTrends,
      completionDetails,
      student,
      upcomingInterviews: interviews,
      recentApplications: recentApps,
      recommendations: dsaMatchRes.results || [],
      dsaMeta: {
        engine: dsaMatchRes.engine,
        algorithm: dsaMatchRes.algorithm,
        timeComplexity: dsaMatchRes.timeComplexity,
        executionTimeMs: dsaMatchRes.executionTimeMs
      }
    });
  } catch (error) {
    console.error('getStudentDashboard error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load student dashboard.' });
  }
}

async function getStudentProfile(req, res) {
  try {
    const sRes = await query('SELECT * FROM students WHERE user_id = $1', [req.user.id]);
    if (sRes.length === 0) {
      return res.status(404).json({ success: false, error: 'Student profile not found.' });
    }
    const student = sRes[0];

    const skillsRes = await query(
      `SELECT sk.name FROM student_skills ss JOIN skills sk ON ss.skill_id = sk.id WHERE ss.student_id = $1`,
      [student.id]
    );
    student.skills = skillsRes.map(s => s.name);

    const projectsRes = await query('SELECT * FROM projects WHERE student_id = $1', [student.id]);
    student.projects = projectsRes;

    const completionDetails = calculateProfileCompletion(student, student.skills, student.projects);
    student.profile_completion = completionDetails.percentage;

    return res.json({
      success: true,
      student,
      completionDetails
    });
  } catch (error) {
    console.error('getStudentProfile error:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve profile.' });
  }
}

async function updateStudentProfile(req, res) {
  try {
    const {
      full_name,
      phone,
      college_name,
      department,
      cgpa,
      graduation_year,
      preferred_domain,
      preferred_locations,
      preferred_work_mode,
      min_stipend,
      bio,
      resume_url,
      avatar,
      skills
    } = req.body;

    const sRes = await query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    if (sRes.length === 0) {
      return res.status(404).json({ success: false, error: 'Student profile not found.' });
    }
    const studentId = sRes[0].id;

    // Update skills first if provided
    if (Array.isArray(skills)) {
      await query('DELETE FROM student_skills WHERE student_id = $1', [studentId]);
      for (const skName of skills) {
        if (!skName || !skName.trim()) continue;
        let skRes = await query('SELECT id FROM skills WHERE LOWER(name) = LOWER($1)', [skName.trim()]);
        let skillId;
        if (skRes.length === 0) {
          const newSk = await query('INSERT INTO skills (name, category) VALUES ($1, $2) RETURNING id', [skName.trim(), 'PROGRAMMING']);
          skillId = newSk[0].id;
        } else {
          skillId = skRes[0].id;
        }
        await query('INSERT INTO student_skills (student_id, skill_id, proficiency_level) VALUES ($1, $2, $3)', [studentId, skillId, 'INTERMEDIATE']);
      }
    }

    // Fetch current profile skills and projects for accurate completion calculation
    const skillsRes = await query(
      `SELECT sk.name FROM student_skills ss JOIN skills sk ON ss.skill_id = sk.id WHERE ss.student_id = $1`,
      [studentId]
    );
    const updatedSkills = skillsRes.map(s => s.name);

    const projectsRes = await query('SELECT * FROM projects WHERE student_id = $1', [studentId]);

    const tempStudentObj = {
      full_name,
      phone,
      college_name,
      department,
      cgpa: cgpa ? parseFloat(cgpa) : null,
      graduation_year: graduation_year ? parseInt(graduation_year, 10) : null,
      preferred_domain,
      preferred_locations,
      preferred_work_mode,
      min_stipend: min_stipend ? parseInt(min_stipend, 10) : 0,
      bio,
      resume_url,
      avatar
    };

    const completionDetails = calculateProfileCompletion(tempStudentObj, updatedSkills, projectsRes);

    await query(
      `UPDATE students SET 
        full_name = COALESCE($1, full_name), 
        phone = COALESCE($2, phone), 
        college_name = COALESCE($3, college_name), 
        department = COALESCE($4, department), 
        cgpa = COALESCE($5, cgpa), 
        graduation_year = COALESCE($6, graduation_year), 
        preferred_domain = COALESCE($7, preferred_domain), 
        preferred_locations = COALESCE($8, preferred_locations), 
        preferred_work_mode = COALESCE($9, preferred_work_mode), 
        min_stipend = COALESCE($10, min_stipend), 
        bio = COALESCE($11, bio), 
        resume_url = COALESCE($12, resume_url), 
        avatar = COALESCE($13, avatar), 
        profile_completion = $14, 
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = $15`,
      [
        full_name || null,
        phone || null,
        college_name || null,
        department || null,
        cgpa ? parseFloat(cgpa) : null,
        graduation_year ? parseInt(graduation_year, 10) : null,
        preferred_domain || null,
        preferred_locations || null,
        preferred_work_mode || null,
        min_stipend ? parseInt(min_stipend, 10) : 0,
        bio || null,
        resume_url || null,
        avatar || null,
        completionDetails.percentage,
        studentId
      ]
    );

    // Fetch refreshed complete student profile record
    const refRes = await query('SELECT * FROM students WHERE id = $1', [studentId]);
    const updatedStudent = refRes[0];
    updatedStudent.skills = updatedSkills;
    updatedStudent.projects = projectsRes;

    return res.json({
      success: true,
      message: 'Profile updated successfully!',
      profileCompletion: completionDetails.percentage,
      completionDetails,
      student: updatedStudent
    });
  } catch (error) {
    console.error('updateStudentProfile error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update profile.' });
  }
}

module.exports = { getStudentDashboard, getStudentProfile, updateStudentProfile };

