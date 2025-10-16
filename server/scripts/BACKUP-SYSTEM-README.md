# Fighters Data Backup System

This directory contains scripts for backing up and restoring fighters data from MongoDB.

## Overview

The backup system provides comprehensive data protection for all fighter information stored in MongoDB, including:

- **Personal Information**: Names, dates of birth, profile images, skillsets
- **Fight Statistics**: Complete fight performance data, striking/grappling stats
- **Streaks**: Win/loss streaks across competitions
- **Head-to-Head Records**: Performance against specific opponents
- **Competition History**: Complete competition participation and titles
- **Physical Attributes**: Height, weight, reach, ratings
- **Earnings**: Financial information by competition
- **Debut Information**: First fight details and dates

## Files

- `backup-fighters-data.js` - Creates comprehensive backups of all fighters data
- `restore-fighters-data.js` - Restores fighters data from backup files
- `backups/` - Directory where backup files are stored (created automatically)

## Usage

### Creating a Backup

```bash
# Using npm script (recommended)
npm run backup:fighters

# Or directly with node
node scripts/backup-fighters-data.js
```

This will create:
- A timestamped JSON file with all fighters data
- A summary text file with backup details
- Automatic validation of the backup integrity

### Listing Available Backups

```bash
# Using npm script
npm run list:backups

# Or directly
node scripts/restore-fighters-data.js list
```

### Validating a Backup

```bash
# Using npm script
npm run validate:backup backups/fighters-backup-2024-01-15.json

# Or directly
node scripts/restore-fighters-data.js validate backups/fighters-backup-2024-01-15.json
```

### Restoring from Backup

```bash
# Restore without clearing existing data
npm run restore:fighters backups/fighters-backup-2024-01-15.json

# Restore and clear existing data first
node scripts/restore-fighters-data.js restore backups/fighters-backup-2024-01-15.json --clear
```

## Backup File Format

Backup files are JSON format with the following structure:

```json
{
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "totalFighters": 150,
    "database": "gql-db",
    "collection": "fighters",
    "backupVersion": "1.0",
    "description": "Complete fighters data backup",
    "fields": {
      "basicInfo": ["firstName", "lastName", "dateOfBirth", ...],
      "statistics": ["fightStats"],
      "streaks": ["streaks"],
      "history": ["opponentsHistory", "competitionHistory"],
      "physical": ["physicalAttributes"],
      "earnings": ["earnings"]
    }
  },
  "fighters": [
    {
      "_id": "ObjectId",
      "firstName": "John",
      "lastName": "Doe",
      "fightStats": { ... },
      "streaks": [ ... ],
      "opponentsHistory": [ ... ],
      "competitionHistory": [ ... ],
      "physicalAttributes": { ... },
      "earnings": { ... }
    }
  ]
}
```

## Safety Features

- **Validation**: All backups are validated for data integrity
- **Metadata**: Comprehensive metadata tracks backup details
- **Error Handling**: Robust error handling with detailed logging
- **Non-destructive**: Backup process doesn't modify existing data
- **Rollback Support**: Easy restore process with validation

## Environment Requirements

- Node.js with ES modules support
- MongoDB connection configured in `.env` file
- Required dependencies: `mongoose`, `fs`, `path`, `dotenv`

## Best Practices

1. **Regular Backups**: Create backups before major data changes
2. **Test Restores**: Periodically test restore process
3. **Multiple Copies**: Keep backups in multiple locations
4. **Version Control**: Don't commit backup files to git
5. **Monitoring**: Monitor backup file sizes and creation frequency

## Troubleshooting

### Common Issues

1. **Connection Errors**: Ensure MongoDB URI is correct in `.env`
2. **Permission Errors**: Check file system permissions for backup directory
3. **Memory Issues**: For large datasets, consider streaming approach
4. **Validation Failures**: Check backup file integrity

### Recovery Procedures

1. **Corrupted Backup**: Use `validate` command to check integrity
2. **Failed Restore**: Check MongoDB connection and permissions
3. **Partial Restore**: Use `--clear` flag to start fresh

## Security Considerations

- Backup files contain sensitive personal information
- Store backups securely with appropriate access controls
- Consider encryption for long-term storage
- Follow data protection regulations (GDPR, etc.)

## Support

For issues or questions about the backup system, check:
1. Console output for detailed error messages
2. Backup summary files for metadata
3. MongoDB connection logs
4. File system permissions

---

**Last Updated**: January 2024  
**Version**: 1.0  
**Compatible with**: MongoDB 4.4+, Node.js 16+
