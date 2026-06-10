const db = require('../src/config/database');

/**
 * Insert default settings into database
 * Run this script: node scripts/insert-default-settings.js
 */

const defaultSettings = {
  id: 'scoring_weights',
  category: 'system',
  name: 'scoring_weights',
  value: {
    quotas: {
      totalSlots: 1000,
      policy_priority: 10,
      freshmen: 60,
      seniors: 30,
      waterfall_enabled: true
    },
    weights: {
      basket1: {
        w1_priority: 0.4,
        w2_year: 0.3,
        w3_gpa: 0.3
      },
      basket2: {
        w1_priority: 0.2,
        w2_year: 0.5,
        w3_gpa: 0.3
      },
      basket3: {
        w1_priority: 0.1,
        w2_year: 0.2,
        w3_gpa: 0.7
      }
    },
    scoreMappings: {
      priority: {
        absolute_policy: 100,
        priority_area: 70,
        other_objects: 30,
        non_priority: 0
      },
      priority_detailed: {
        ho_ngheo: 40,
        can_ngheo: 35,
        khuyet_tat: 30,
        liet_sy: 50,
        thuong_binh: 45,
        luu_hoc_sinh: 40,
        vung_sau_xa: 20,
        hai_dao: 25,
        hoan_canh_kho_khan: 30,
        giay_xac_nhan: 15
      },
      year: {
        year1: 100,
        year2: 60,
        year3: 40,
        year4: 20
      },
      gpa: {
        conversion_factor: 25,
        min_gpa_filter: 2.0
      }
    }
  },
  description: 'Cấu hình hệ thống chấm điểm và phân bổ chỗ ở cho đăng ký KTX',
  is_active: true
};

async function insertDefaultSettings() {
  try {
    console.log('🔄 Checking if scoring_weights exists...');
    
    // Check if exists
    const checkQuery = `SELECT * FROM settings WHERE id = $1`;
    const checkResult = await db.query(checkQuery, [defaultSettings.id]);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ scoring_weights already exists!');
      console.log('Current value:', JSON.stringify(checkResult.rows[0].value, null, 2));
      
      // Ask if want to update
      console.log('\n💡 To update, delete the existing record first:');
      console.log(`   psql -d dormitory_system -c "DELETE FROM settings WHERE id = 'scoring_weights'"`);
      return;
    }
    
    // Insert new record
    console.log('🔄 Inserting default scoring_weights...');
    const insertQuery = `
      INSERT INTO settings (id, category, name, value, description, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await db.query(insertQuery, [
      defaultSettings.id,
      defaultSettings.category,
      defaultSettings.name,
      JSON.stringify(defaultSettings.value),
      defaultSettings.description,
      defaultSettings.is_active
    ]);
    
    console.log('✅ SUCCESS! Default scoring_weights inserted:');
    console.log(JSON.stringify(result.rows[0], null, 2));
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  } finally {
    await db.end();
    process.exit(0);
  }
}

// Run the script
insertDefaultSettings();
